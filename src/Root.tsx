import { Composition, staticFile } from "remotion";
import { Scene, myCompSchema } from "./Scene";
import { getMediaMetadata } from "./helpers/get-media-metadata";
import { ChanganFilm } from "./changan/Film";
import { MaterialStudy } from "./changan/MaterialStudy";

// Welcome to the Remotion Three Starter Kit!
// Two compositions have been created, showing how to use
// the `ThreeCanvas` component and the `useVideoTexture` hook.

// You can play around with the example or delete everything inside the canvas.

// Remotion Docs:
// https://remotion.dev/docs

// @remotion/three Docs:
// https://remotion.dev/docs/three

// React Three Fiber Docs:
// https://docs.pmnd.rs/react-three-fiber/getting-started/introduction

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="ChanganMaterialStudy" component={MaterialStudy} durationInFrames={300} fps={30} width={1920} height={1080} />
      <Composition id="ChanganGateTest" component={ChanganFilm} durationInFrames={240} fps={30} width={1920} height={1080} defaultProps={{test: true}} />
      <Composition id="Changan" component={ChanganFilm} durationInFrames={1800} fps={30} width={1920} height={1080} defaultProps={{test: false}} />
      <Composition
        id="Scene"
        component={Scene}
        fps={30}
        durationInFrames={300}
        width={1280}
        height={720}
        schema={myCompSchema}
        defaultProps={{
          deviceType: "phone",
          phoneColor: "rgb(110, 152, 191)" as const,
          baseScale: 1,
          mediaMetadata: null,
          videoSrc: null,
        }}
        calculateMetadata={async ({ props }) => {
          const videoSrc =
            props.deviceType === "phone"
              ? staticFile("phone.mp4")
              : staticFile("tablet.mp4");

          const mediaMetadata = await getMediaMetadata(videoSrc);

          return {
            props: {
              ...props,
              mediaMetadata,
              videoSrc,
            },
          };
        }}
      />
    </>
  );
};
