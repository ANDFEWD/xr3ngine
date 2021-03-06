import React, { useEffect, useState } from 'react';
import './style.scss';
import PartyParticipantWindow from '../PartyParticipantWindow';
import { Grid } from '@material-ui/core';
import { MediaStreamComponent } from '@xr3ngine/engine/src/networking/components/MediaStreamComponent';
import { MediaStreamSystem } from '@xr3ngine/engine/src/networking/systems/MediaStreamSystem';
import { observer } from 'mobx-react';

const Me = observer(() => {
    // Listening on MediaStreamComponent.instance doesn't appear to register for some reason, but listening
    // to an observable property of it does.

    useEffect(() => {
        console.log('camVideoProducer changed');
        console.log(MediaStreamComponent.instance);
    }, [MediaStreamComponent.instance?.camVideoProducer]);
  return (
    <Grid className="me-party-user-container" container>
        {
            (MediaStreamComponent.instance?.camVideoProducer || MediaStreamComponent.instance?.camAudioProducer) && <PartyParticipantWindow
            containerProportions={{
              height: 135,
              width: 240
            }}
            peerId={'me_cam'}
            />
        }
        {
            (MediaStreamComponent.instance?.screenVideoProducer || MediaStreamComponent.instance?.screenAudioProducer) && <PartyParticipantWindow
                containerProportions={{
                    height: 135,
                    width: 240
                }}
                peerId={'me_screen'}
            />
        }
    </Grid>
  );
});

export default Me;
