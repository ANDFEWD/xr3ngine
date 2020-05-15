import { RealtimeStore } from "../../../realtime-store/realtime-store.class";
import IInstanceType from '../instancet-type.interface'
import { GraphQLObjectType, GraphQLList } from "graphql";
// @ts-ignore
import { attributeFields } from 'graphql-sequelize'
import { GraphQLString } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { PubSub} from "graphql-subscriptions";
// @ts-ignore
import AgonesSDK from '@google-cloud/agones-sdk'

export default class ComponentInstance implements IInstanceType {
    model: any
    idField: any
    pubSubInstance: PubSub
    realtimeService: any
    agonesSDK: AgonesSDK
    constructor(model: any, realtimeService: any, pubSubInstance: PubSub, agonesSDK: AgonesSDK){
        this.model = model
        this.idField = { id: attributeFields(model).id }
        this.pubSubInstance = pubSubInstance
        this.realtimeService = realtimeService
        this.agonesSDK = agonesSDK
    }

    mutations = {
        findComponentInstances: {
            type: new GraphQLList(new GraphQLObjectType({
                name: 'findComponentInstances',
                description: 'Find component instances on a realtime server',
                fields: () => ({
                    ...attributeFields(this.model)
                })
            })),
            args: {
                query: {
                    type: GraphQLString
                }
            },
            resolve: async(source: any, args: any, context: any, info: any) => {
                const query = JSON.parse(args.query)
                return await this.realtimeService.find({ type: 'component', query: query })
            }
        },
        getComponentInstance: {
            type: new GraphQLObjectType({
                name: 'getComponentInstance',
                description: 'Get a single component instance on a realtime server',
                fields: () => ({
                    ...attributeFields(this.model)
                })
            }),
            args: {
                id: {
                    type: GraphQLString
                }
            },
            resolve: async(source: any, args: any, context: any, info: any) => {
                return await this.realtimeService.get(args.id, { type: 'component' })
            }
        },
        addComponentInstance: {
            type: new GraphQLObjectType({
                name: 'addComponentInstance',
                description: 'Add a component instance to this server',
                fields: () => ({
                    ...attributeFields(this.model)
                })
            }),
            args: {
                id: {
                    type: GraphQLString
                },
                data: {
                    type: GraphQLString
                }
            },
            resolve: async(source: any, args: any, context: any, info: any) => {
                const newComponent = await this.realtimeService.create({
                    type: 'component',
                    object: args
                })

                this.pubSubInstance.publish('componentInstanceCreated', {
                    componentInstanceCreated: args
                })

                return newComponent
            }
        },
        patchComponentInstance: {
            type: new GraphQLObjectType({
                name: 'patchComponentInstance',
                description: 'Patch a component instance on this server',
                fields: () => ({
                    ...attributeFields(this.model)
                })
            }),
            args: {
                id: {
                    type: GraphQLString
                },
                data: {
                    type: GraphQLString
                }
            },
            resolve: async(source: any, args: any, context: any, info: any) => {
                const patchedComponent = await this.realtimeService.patch(args.id, {
                    type: 'component',
                    object: args
                })

                this.pubSubInstance.publish('componentInstancePatched', {
                    componentInstancePatched: patchedComponent
                })

                return patchedComponent
            }
        },
        removeComponentInstance: {
            type: new GraphQLObjectType({
                name: 'removeComponentInstance',
                description: 'Remove a component instance from this server',
                fields: () => (this.idField)
            }),
            args: {
                id: {
                    type: GraphQLString
                }
            },
            resolve: async(source: any, args: any, context: any, info: any) => {
                await this.realtimeService.remove(args.id, {
                    type: 'component'
                })

                this.pubSubInstance.publish('componentInstanceRemoved', {
                    componentInstanceRemoved: args
                })

                return args
            }
        }
    }

    subscriptions = {
        componentInstanceCreated: {
            type: new GraphQLObjectType({
                name: 'componentInstanceCreated',
                description: 'Listen for when components are added to this server',
                fields: () => ({
                    ...attributeFields(this.model)
                })
            }),
            subscribe: withFilter(
                () => this.pubSubInstance.asyncIterator('componentInstanceCreated'),
                (payload, args) => {
                    return true
                }
            )
        },
        componentInstancePatched: {
            type: new GraphQLObjectType({
                name: 'componentInstancePatched',
                description: 'Listen for when components are patched on this server',
                fields: () => ({
                    ...attributeFields(this.model)
                })
            }),
            subscribe: withFilter(
                () => this.pubSubInstance.asyncIterator('componentInstancePatched'),
                (payload, args) => {
                    return true
                }
            )
        },
        componentInstanceRemoved: {
            type: new GraphQLObjectType({
                name: 'componentInstanceRemoved',
                description: 'Listen for when components are added to this server',
                fields: () => (this.idField)
            }),
            subscribe: withFilter(
                () => this.pubSubInstance.asyncIterator('componentInstanceRemoved'),
                (payload, args) => {
                    return true
                }
            )
        }
    }
}