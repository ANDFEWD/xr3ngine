import {MediaStreamComponent} from "@xr3ngine/engine/src/networking/components/MediaStreamComponent"
import {Network} from "@xr3ngine/engine/src/networking/components/Network"
import {MessageTypes} from "@xr3ngine/engine/src/networking/enums/MessageTypes"
import {NetworkTransport} from "@xr3ngine/engine/src/networking/interfaces/NetworkTransport"
import {
    CreateWebRtcTransportParams,
    UnreliableMessageReturn
} from "@xr3ngine/engine/src/networking/types/NetworkingTypes"
import * as https from "https"
import {createWorker} from 'mediasoup'
import {types as MediaSoupClientTypes} from "mediasoup-client"
import {SctpParameters} from "mediasoup-client/lib/SctpParameters"
import {
    DataConsumer,
    DataProducer,
    DataProducerOptions,
    Producer,
    Router,
    RtpCodecCapability,
    Transport,
    WebRtcTransport,
    Worker
} from "mediasoup/lib/types"
import SocketIO, {Socket} from "socket.io"
import app from '../../app'
import logger from "../../app/logger"
import getLocalServerIp from '../../util/get-local-server-ip'

interface Client {
    socket: SocketIO.Socket;
    lastSeenTs: number;
    joinTs: number;
    media: any;
    consumerLayers: any;
    stats: any;
}

const config = {
    httpPeerStale: 15000,
    mediasoup: {
        worker: {
            rtcMinPort: 40000,
            rtcMaxPort: 49999,
            logLevel: "info",
            logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"]
        },
        router: {
            mediaCodecs: [
                {
                    kind: "audio",
                    mimeType: "audio/opus",
                    clockRate: 48000,
                    channels: 2
                },
                {
                    kind: "video",
                    mimeType: "video/VP8",
                    clockRate: 90000,
                    parameters: {
                        //                'x-google-start-bitrate': 1000
                    }
                },
                {
                    kind: "video",
                    mimeType: "video/h264",
                    clockRate: 90000,
                    parameters: {
                        "packetization-mode": 1,
                        "profile-level-id": "4d0032",
                        "level-asymmetry-allowed": 1
                    }
                },
                {
                    kind: "video",
                    mimeType: "video/h264",
                    clockRate: 90000,
                    parameters: {
                        "packetization-mode": 1,
                        "profile-level-id": "42e01f",
                        "level-asymmetry-allowed": 1
                    }
                }
            ]
        },

        // rtp listenIps are the most important thing, below. you'll need
        // to set these appropriately for your network for the demo to
        // run anywhere but on localhost
        webRtcTransport: {
            listenIps: [{ip: "192.168.0.81", announcedIp: null}],
            initialAvailableOutgoingBitrate: 800000,
            maxIncomingBitrate: 150000
        }
    }
}

const defaultRoomState = {
    // external
    activeSpeaker: {producerId: null, volume: null, peerId: null},
    // internal
    transports: {},
    producers: [],
    consumers: [],
    peers: {}
    // These are now kept for each individual client (in peers object)
    // dataProducers: [] as DataProducer[],
    // dataConsumers: [] as DataConsumer[]
}

const sctpParameters: SctpParameters = {
    OS: 1024,
    MIS: 65535,
    maxMessageSize: 65535,
    port: 5000
}

export class SocketWebRTCServerTransport implements NetworkTransport {
    isServer: boolean = true
    server: https.Server
    socketIO: SocketIO.Server
    worker: Worker
    router: Router
    transport: Transport
    isInitialized: boolean = false

    sendReliableData(message: any): void {
        if (!this.isInitialized) return
        this.socketIO.sockets.emit(MessageTypes.ReliableMessage.toString(), message)
    }

    async sendData(data: any, channel: string = 'default'): Promise<UnreliableMessageReturn> {
        if (this.transport === undefined) return
        try {
            return await this.transport.produceData({
                appData: {data},
                sctpStreamParameters: data.sctpStreamParameters,
                label: channel,
                protocol: 'raw'
            })
        } catch (error) {
            console.log(error)
        }
    }

    public async initialize(address, port = 3030): Promise<void> {
        if (this.isInitialized) console.error("Already initialized transport")
        logger.info('Initializing server transport')
        if (process.env.KUBERNETES === 'true')
            (app as any).agonesSDK.getGameServer().then((gsStatus) => {
                config.mediasoup.webRtcTransport.listenIps = [{ip: gsStatus.status.address, announcedIp: null}]
            })

        else {
            const localIp = await getLocalServerIp();
            config.mediasoup.webRtcTransport.listenIps = [{ip: localIp.ipAddress, announcedIp: null}]
        }

        logger.info('Starting WebRTC')
        await this.startMediasoup()

        // Start Websockets
        logger.info("Starting websockets")
        this.socketIO = (app as any)?.io

        this.socketIO.sockets.on("connect", (socket: Socket) => {
            logger.info('Socket Connected')
            Network.instance.clients[socket.id] = {
                userId: socket.id,
                socket: socket,
                lastSeenTs: Date.now(),
                joinTs: Date.now(),
                media: {},
                consumerLayers: {},
                stats: {},
                dataConsumers: new Map<string, DataConsumer>(), // Key => id of data producer
                dataProducers: new Map<string, DataProducer>() // Key => label of data channel
            }

            console.log(Network.instance.clients[socket.id]);

            console.log("Message handlers")
            console.log(Network.instance.schema.messageHandlers)
            // Call all message handlers associated with client connection
            Network.instance.schema.messageHandlers[MessageTypes.ClientConnected.toString()].forEach(behavior => {
                console.log("Calling behavior")
                const client = Network.instance.clients[socket.id];
                behavior.behavior(
                    {
                        id: socket.id,
                        media: client.media
                    },
                )
            })

            // If a reliable message is received, add it to the queue
            socket.on(MessageTypes.ReliableMessage.toString(), (message) => {
                console.log("Received message", message)
                Network.instance.incomingMessageQueue.add(message.data)
            })

            // Handle the disconnection
            socket.on("disconnect", () => {
                console.log(socket.id + " disconnected")
                Network.instance.worldState.clientsDisconnected.push(socket.id)
                const disconnectedClient = Network.instance.clients[socket.id];
                if (disconnectedClient?.recvTransport) disconnectedClient.recvTransport.close();
                if (disconnectedClient?.sendTransport) disconnectedClient.sendTransport.close();
                delete Network.instance.clients[socket.id]
            })

            socket.on(MessageTypes.JoinWorld.toString(), async (data, callback) => {
                // Add user ID to peer list
                console.log('Joining world')
                console.log('Socket client before setting userId')
                console.log(Network.instance.clients[socket.id])
                Network.instance.clients[socket.id].userId = socket.id

                console.log('Socket client after setting userId')
                console.log(Network.instance.clients[socket.id])

                // Prepare a worldstate frame
                const worldState = {
                    tick: Network.tick,
                    transforms: [],
                    inputs: [],
                    clientsConnected: [],
                    clientsDisconnected: [],
                    createObjects: [],
                    destroyObjects: []
                }

                // Get all clients and add to clientsConnected
                for (const clientId in Network.instance.clients)
                    worldState.clientsConnected.push({clientId, userId: Network.instance.clients[clientId].userId})

                // Get all network objects and add to createObjects
                for (const networkId in Network.instance.networkObjects)
                    worldState.createObjects.push({
                        prefabType: Network.instance.networkObjects[networkId].prefabType,
                        networkid: networkId,
                        ownerId: Network.instance.networkObjects[networkId].ownerId
                    })

                // TODO: Get all inputs and add to inputs

                console.log("Sending world state")
                console.log(worldState)

                try {
                    // Convert world state to buffer and send along
                    callback({
                        worldState /* worldState: worldStateModel.toBuffer(worldState) */,
                        routerRtpCapabilities: this.router.rtpCapabilities
                    })
                } catch (error) {
                    console.log(error)
                }
            })

            // --> /signaling/leave
            // removes the peer from the roomState data structure and and closes
            // all associated mediasoup objects
            socket.on(MessageTypes.LeaveWorld.toString(), async (data, callback) => {
                if (MediaStreamComponent.instance.transports)
                    for (const [, transport] of Object.entries(MediaStreamComponent.instance.transports))
                        if ((transport as any).appData.peerId === socket.id)
                            this.closeTransport(transport)
                delete Network.instance.clients[socket.id]
                logger.info("Removing " + socket.id + " from client list")
                callback({})
            });

            // --> /signaling/create-transport
            // create a mediasoup transport object and send back info needed
            // to create a transport object on the client side
            socket.on(MessageTypes.WebRTCTransportCreate.toString(), async (data: CreateWebRtcTransportParams, callback) => {
                const {direction, peerId, sctpCapabilities} = Object.assign(data, {peerId: socket.id})
                logger.info("WebRTCTransportCreateRequest: " + peerId + " " + direction)

                const transport: WebRtcTransport = await this.createWebRtcTransport(
                    {peerId, direction, sctpCapabilities}
                )

                this.transport = transport

                await transport.setMaxIncomingBitrate(config.mediasoup.webRtcTransport.maxIncomingBitrate)

                MediaStreamComponent.instance.transports[transport.id] = transport

                // Distinguish between send and create transport of each client w.r.t producer and consumer (data or mediastream)
                if (direction === 'recv') {
                    Network.instance.clients[socket.id].recvTransport = transport
                }
                else if (direction === 'send') {
                    Network.instance.clients[socket.id].sendTransport = transport
                }

                const {id, iceParameters, iceCandidates, dtlsParameters} = transport
                const clientTransportOptions: MediaSoupClientTypes.TransportOptions = {
                    id,
                    sctpParameters: {
                        ...sctpParameters,
                        OS: sctpCapabilities.numStreams.OS,
                        MIS: sctpCapabilities.numStreams.MIS
                    },
                    iceParameters,
                    iceCandidates,
                    dtlsParameters
                }

                // Create data consumers for other clients if the current client transport receives data producer on it
                transport.observer.on('newdataproducer', this.handleConsumeDataEvent(socket))
                transport.observer.on('newproducer', this.sendCurrentProducers(socket))
                callback({transportOptions: clientTransportOptions})
            })

            socket.on(MessageTypes.WebRTCProduceData.toString(), async (params, callback) => {
                logger.info('Produce Data handler')
                try {
                    if (!params.label) throw ({error: 'data producer label i.e. channel name is not provided!'})
                    const {transportId, sctpStreamParameters, label, protocol, appData} = params
                    logger.info("Data channel label: `'${label}'` -- client id: " + socket.id)
                    logger.info("Data producer params", params)
                    const transport: Transport = MediaStreamComponent.instance.transports[transportId]
                    const options: DataProducerOptions = {
                        label,
                        protocol,
                        sctpStreamParameters,
                        appData: {...(appData || {}), peerID: socket.id, transportId}
                    }
                    const dataProducer = await transport.produceData(options)

                    console.log(`socket ${socket.id} producing data`)
                    console.log(Network.instance.clients[socket.id])
                    if (Network.instance.clients[socket.id].dataProducers)
                        Network.instance.clients[socket.id].dataProducers.set(label, dataProducer)
                    else console.log("Network.instance.clients[socket.id].dataProducers is nulled" + Network.instance.clients[socket.id].dataProducers)
                    // if our associated transport closes, close ourself, too
                    dataProducer.on("transportclose", () => {
                        logger.info("data producer's transport closed: " + dataProducer.id)
                        dataProducer.close()
                        Network.instance.clients[socket.id].dataProducers.delete(socket.id)
                    })
                    // Possibly do stuff with appData here
                    logger.info("Sending dataproducer id to client:" + dataProducer.id)
                    return callback({id: dataProducer.id})
                } catch (error) {
                    console.log(error)
                }
            })

            // called from inside a client's `transport.on('connect')` event handler.
            socket.on(MessageTypes.WebRTCTransportConnect.toString(), async (data, callback) => {
                const {transportId, dtlsParameters} = data,
                    transport = MediaStreamComponent.instance.transports[transportId]
                logger.info("WebRTCTransportConnectRequest: " + socket.id + transport.appData)
                await transport.connect({dtlsParameters})
                callback({connected: true})
            })

            // called by a client that wants to close a single transport (for
            // example, a client that is no longer sending any media).
            socket.on(MessageTypes.WebRTCTransportClose.toString(), async (data, callback) => {
                try {
                    logger.info("close-transport: " + socket.id)
                    const {transportId} = data
                    this.transport = MediaStreamComponent.instance.transports[transportId]
                    await this.closeTransport(this.transport)
                    callback({closed: true})
                } catch (err) {
                    logger.info('WebRTC Transport close error')
                    logger.info(err)
                }
            })

            // called by a client that is no longer sending a specific track
            socket.on(MessageTypes.WebRTCCloseProducer.toString(), async (data, callback) => {
                logger.info('Close Producer handler')
                const {producerId} = data,
                    producer = MediaStreamComponent.instance.producers.find(p => p.id === producerId)
                await this.closeProducerAndAllPipeProducers(producer, socket.id)
                callback({closed: true})
            })

            // called from inside a client's `transport.on('produce')` event handler.
            socket.on(MessageTypes.WebRTCSendTrack.toString(), async (data, callback) => {
                try {
                    logger.info('Send Track handler')
                    const {transportId, kind, rtpParameters, paused = false, appData} = data,
                        transport = MediaStreamComponent.instance.transports[transportId]

                    const producer = await transport.produce({
                        kind,
                        rtpParameters,
                        paused,
                        appData: {...appData, peerId: socket.id, transportId}
                    })

                    // if our associated transport closes, close ourself, too
                    producer.on("transportclose", () => {
                        this.closeProducerAndAllPipeProducers(producer, socket.id)
                    })

                    logger.info('New producer')
                    logger.info(producer._data.rtpParameters)

                    MediaStreamComponent.instance.producers.push(producer)
                    console.log(socket.id)
                    console.log(Network.instance.clients)
                    Network.instance.clients[socket.id].media[appData.mediaTag] = {
                        paused,
                        encodings: rtpParameters.encodings
                    }

                    Object.keys(Network.instance.clients).forEach((key) => {
                        const client = Network.instance.clients[key]
                        if (client.socket.id === socket.id) return
                        client.socket.emit(MessageTypes.WebRTCCreateProducer.toString(), socket.id, appData.mediaTag)
                    })

                    callback({id: producer.id})
                } catch (err) {
                    console.log('sendtrack error:')
                    console.log(err)
                }
            })

            // create a mediasoup consumer object, hook it up to a producer here
            // on the server side, and send back info needed to create a consumer
            // object on the client side. always start consumers paused. client
            // will request media to resume when the connection completes
            socket.on(MessageTypes.WebRTCReceiveTrack.toString(), async (data, callback) => {
                logger.info('Receive Track handler')
                logger.info(data)
                const {mediaPeerId, mediaTag, rtpCapabilities} = data
                const producer = MediaStreamComponent.instance.producers.find(
                    p => p._appData.mediaTag === mediaTag && p._appData.peerId === mediaPeerId
                );
                if (producer == null || !this.router.canConsume({producerId: producer.id, rtpCapabilities})) {
                    const msg = `client cannot consume ${mediaPeerId}:${mediaTag}`
                    console.error(`recv-track: ${socket.id} ${msg}`)
                    callback({error: msg})
                    return
                }

                const transport = Object.values(MediaStreamComponent.instance.transports).find(
                    t => (t as any)._appData.peerId === socket.id && (t as any)._appData.clientDirection === "recv"
                )

                const consumer = await (transport as any).consume({
                    producerId: producer.id,
                    rtpCapabilities,
                    paused: true, // see note above about always starting paused
                    appData: {peerId: socket.id, mediaPeerId, mediaTag}
                })

                logger.info('New consumer: ')
                logger.info(consumer)
                logger.info('Transport used:')
                logger.info(transport)

                // need both 'transportclose' and 'producerclose' event handlers,
                // to make sure we close and clean up consumers in all
                // circumstances
                consumer.on("transportclose", () => {
                    logger.info(`consumer's transport closed`, consumer.id)
                    this.closeConsumer(consumer)
                })
                consumer.on("producerclose", () => {
                    logger.info(`consumer's producer closed`, consumer.id)
                    this.closeConsumer(consumer)
                })
                consumer.on('producerpause', () => {
                    logger.info(`consumer's producer paused`, consumer.id)
                    consumer.pause()
                    socket.emit(MessageTypes.WebRTCPauseConsumer.toString(), consumer.id)
                })
                consumer.on('producerresume', () => {
                    logger.info(`consumer's producer resumed`, consumer.id)
                    consumer.resume()
                    socket.emit(MessageTypes.WebRTCResumeConsumer.toString(), consumer.id)
                })

                // stick this consumer in our list of consumers to keep track of,
                // and create a data structure to track the client-relevant state
                // of this consumer
                MediaStreamComponent.instance.consumers.push(consumer)
                Network.instance.clients[socket.id].consumerLayers[consumer.id] = {
                    currentLayer: null,
                    clientSelectedLayer: null
                }

                // update above data structure when layer changes.
                consumer.on("layerschange", layers => {
                    if (Network.instance.clients[socket.id] && Network.instance.clients[socket.id].consumerLayers[consumer.id])
                        Network.instance.clients[socket.id].consumerLayers[consumer.id].currentLayer = layers && layers.spatialLayer
                })

                callback({
                    producerId: producer.id,
                    id: consumer.id,
                    kind: consumer.kind,
                    rtpParameters: consumer.rtpParameters,
                    type: consumer.type,
                    producerPaused: consumer.producerPaused
                })
            })

            // called to pause receiving a track for a specific client
            socket.on(MessageTypes.WebRTCPauseConsumer.toString(), async (data, callback) => {
                const {consumerId} = data,
                    consumer = MediaStreamComponent.instance.consumers.find(c => c.id === consumerId)
                logger.info("pause-consumer", consumer.appData)
                await consumer.pause()
                callback({paused: true})

            })

            // called to resume receiving a track for a specific client
            socket.on(MessageTypes.WebRTCResumeConsumer.toString(), async (data, callback) => {
                const {consumerId} = data,
                    consumer = MediaStreamComponent.instance.consumers.find(c => c.id === consumerId)
                logger.info("resume-consumer", consumer.appData)
                await consumer.resume()
                callback({resumed: true})
            })

            // --> /signalign/close-consumer
            // called to stop receiving a track for a specific client. close and
            // clean up consumer object
            socket.on(MessageTypes.WebRTCCloseConsumer.toString(), async (data, callback) => {
                const {consumerId} = data,
                    consumer = MediaStreamComponent.instance.consumers.find(c => c.id === consumerId)
                logger.info(`Close Consumer handler: ${consumerId}`)
                await this.closeConsumer(consumer)
                callback({closed: true})
            })

            // --> /signaling/consumer-set-layers
            // called to set the largest spatial layer that a specific client
            // wants to receive
            socket.on(MessageTypes.WebRTCConsumerSetLayers.toString(), async (data, callback) => {
                const {consumerId, spatialLayer} = data,
                    consumer = MediaStreamComponent.instance.consumers.find(c => c.id === consumerId)
                logger.info("consumer-set-layers: ", spatialLayer, consumer.appData)
                await consumer.setPreferredLayers({spatialLayer})
                callback({layersSet: true})
            })

            // --> /signaling/pause-producer
            // called to stop sending a track from a specific client
            // socket.on(MessageTypes.WebRTCCloseProducer.toString(), async (data, callback) => {
            //     logger.info('Close Producer handler')
            //     const {producerId} = data,
            //         producer = MediaStreamComponent.instance.producers.find(p => p.id === producerId)
            //     logger.info("pause-producer", producer.appData)
            //     await producer.pause()
            //     Network.instance.clients[socket.id].media[producer.appData.mediaTag].paused = true
            //     callback({paused: true})
            // })

            // --> /signaling/resume-producer
            // called to resume sending a track from a specific client
            socket.on(MessageTypes.WebRTCResumeProducer.toString(), async (data, callback) => {
                const {producerId} = data,
                    producer = MediaStreamComponent.instance.producers.find(p => p.id === producerId)
                logger.info("resume-producer", producer.appData)
                await producer.resume()
                Network.instance.clients[socket.id].media[producer.appData.mediaTag].paused = false
                callback({resumed: true})
            })

            // --> /signaling/resume-producer
            // called to resume sending a track from a specific client
            socket.on(MessageTypes.WebRTCPauseProducer.toString(), async (data, callback) => {
                const {producerId} = data,
                    producer = MediaStreamComponent.instance.producers.find(p => p.id === producerId);
                logger.info("pause-producer: ", producer.appData);
                await producer.pause();
                Network.instance.clients[socket.id].media[producer.appData.mediaTag].paused = true;
                callback({paused: true})
            })
        })
        this.isInitialized = true
    }

    // start mediasoup with a single worker and router
    async startMediasoup(): Promise<void> {
        logger.info("Starting WebRTC Server")
        // Initialize roomstate
        this.worker = await createWorker({
            logLevel: 'warn',
            rtcMinPort: config.mediasoup.worker.rtcMinPort,
            rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
            // dtlsCertificateFile: serverConfig.server.certPath,
            // dtlsPrivateKeyFile: serverConfig.server.keyPath,
            logTags: ['sctp']
        })

        this.worker.on("died", () => {
            console.error("mediasoup worker died (this should never happen)")
            process.exit(1)
        })

        logger.info("Created Mediasoup worker")

        const mediaCodecs = config.mediasoup.router.mediaCodecs as RtpCodecCapability[]
        this.router = await this.worker.createRouter({mediaCodecs})
        logger.info("Worker created router")
    }

    sendCurrentProducers = (socket: SocketIO.Socket) => async (
        producer: Producer
    ) => {
        console.log('Creating consumers for existing client media')
        const selfClient = Network.instance.clients[socket.id]
        if (selfClient.socket != null) {
            Object.entries(Network.instance.clients).forEach(([name, value]) => {
                if (name === socket.id || value.media == null || value.socket == null) return
                console.log(`Sending media for ${name}`)
                Object.entries(value.media).map(([subName]) => {
                    console.log(`Emitting createProducer for socket ${socket.id} of type ${subName}`)
                    selfClient.socket.emit(MessageTypes.WebRTCCreateProducer.toString(), value.userId, subName)
                })
            })
        }
    }
    // Create consumer for each client!
    handleConsumeDataEvent = (socket: SocketIO.Socket) => async (
        dataProducer: DataProducer
    ) => {
        logger.info('Data Consumer being created on server by client: ' + socket.id)
        Object.keys(Network.instance.clients).filter(id => id !== socket.id).forEach(async (socketId: string) => {
            try {
                console.log("Client info: ")
                console.log(Network.instance.clients[socketId])
                const transport: Transport = Network.instance.clients[socketId].recvTransport
                const dataConsumer = await transport.consumeData({
                    dataProducerId: dataProducer.id,
                    appData: {peerId: socket.id, transportId: transport.id},
                    maxPacketLifeTime:
                    dataProducer.sctpStreamParameters.maxPacketLifeTime,
                    maxRetransmits: dataProducer.sctpStreamParameters.maxRetransmits,
                    ordered: false,
                })
                logger.info('Data Consumer created!')
                dataConsumer.on('producerclose', () => {
                    dataConsumer.close()
                    Network.instance.clients[socket.id].dataConsumers.delete(
                        dataProducer.id
                    )
                })
                logger.info('Setting data consumer to room state')
                Network.instance.clients[socket.id].dataConsumers.set(
                    dataProducer.id,
                    dataConsumer
                )
                // Currently Creating a consumer for each client and making it subscribe to the current producer
                socket.to(socketId).emit(MessageTypes.WebRTCConsumeData.toString(), {
                    dataProducerId: dataProducer.id,
                    sctpStreamParameters: dataConsumer.sctpStreamParameters,
                    label: dataConsumer.label,
                    id: dataConsumer.id,
                    appData: dataConsumer.appData,
                    protocol: 'json',
                } as MediaSoupClientTypes.DataConsumerOptions)
            } catch (error) {
                console.log(error)
            }
        })
    }

    async closeTransport(transport): Promise<void> {
        logger.info("closing transport " + transport.id, transport.appData)
        // our producer and consumer event handlers will take care of
        // calling closeProducer() and closeConsumer() on all the producers
        // and consumers associated with this transport
        await transport.close()
        delete MediaStreamComponent.instance.transports[transport.id]
    }

    async closeProducer(producer): Promise<void> {
        logger.info("closing producer " + producer.id, producer.appData)
        await producer.close()

        MediaStreamComponent.instance.producers = MediaStreamComponent.instance.producers.filter(p => p.id !== producer.id)

        if (Network.instance.clients[producer.appData.peerId])
            delete Network.instance.clients[producer.appData.peerId].media[producer.appData.mediaTag]
    }

    async closeProducerAndAllPipeProducers(producer, peerId): Promise<void> {
        if (producer != null) {
            logger.info("closing producer and all pipe producer " + producer.id, producer.appData)

            // remove this producer from our roomState.producers list
            MediaStreamComponent.instance.producers = MediaStreamComponent.instance.producers.filter(p => p.id !== producer.id)

            // finally, close the original producer
            await producer.close()

            // remove this producer from our roomState.producers list
            MediaStreamComponent.instance.producers = MediaStreamComponent.instance.producers.filter(p => p.id !== producer.id)
            MediaStreamComponent.instance.consumers = MediaStreamComponent.instance.consumers.filter(c => !(c.appData.mediaTag === producer.appData.mediaTag && c._internal.producerId === producer.id ))

            // remove this track's info from our roomState...mediaTag bookkeeping
            delete Network.instance.clients[producer.appData.peerId].media[producer.appData.mediaTag]
        }
    }

    async closeConsumer(consumer): Promise<void> {
        logger.info("closing consumer " + consumer.id)
        console.log(consumer)
        console.log(MediaStreamComponent.instance.consumers)
        await consumer.close()

        MediaStreamComponent.instance.consumers = MediaStreamComponent.instance.consumers.filter(c => c.id !== consumer.id)
        Object.entries(Network.instance.clients).forEach(([, value]) => {
            value.socket.emit(MessageTypes.WebRTCCloseConsumer, consumer.id);
        })

        delete Network.instance.clients[consumer.appData.peerId].consumerLayers[consumer.id]
    }

    async createWebRtcTransport({peerId, direction, sctpCapabilities}: CreateWebRtcTransportParams): Promise<WebRtcTransport> {
        logger.info("Creating Mediasoup transport")
        const {listenIps, initialAvailableOutgoingBitrate} = config.mediasoup.webRtcTransport
        const transport = await this.router.createWebRtcTransport({
            listenIps: listenIps,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            enableSctp: true, // Enabling it for setting up data channels
            numSctpStreams: sctpCapabilities.numStreams,
            initialAvailableOutgoingBitrate: initialAvailableOutgoingBitrate,
            appData: {peerId, clientDirection: direction}
        })

        return transport
    }
}