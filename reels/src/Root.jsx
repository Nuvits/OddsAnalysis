import React from 'react';
import { Composition } from 'remotion';
import { Reel, FPS, TOTAL_FRAMES } from './Reel';
import sample from './sample-props.json';

// 1080x1920 (9:16), 30 fps, 30 seconds – Instagram Reels format.
export const Root = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={TOTAL_FRAMES}
    defaultProps={sample}
  />
);
