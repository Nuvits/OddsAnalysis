import React from 'react';
import { Composition } from 'remotion';
import { Reel, FPS, totalFrames } from './Reel';
import sample from './sample-props.json';

// 1080x1920 (9:16), 30 fps – Instagram Reels format. 30 seconds, or 35 when the "above 75%" scene is included.
export const Root = () => (
  <Composition
    id="Reel"
    component={Reel}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={totalFrames(sample)}
    calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props) })}
    defaultProps={sample}
  />
);
