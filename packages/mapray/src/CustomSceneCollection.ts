import type Viewer from "./Viewer";
import type RenderStage from "./RenderStage";
import CustomScene from "./CustomScene";


/**
 * カスタム描画シーンを管理するクラス
 *
 * @see Viewer.custom_scene_collection
 */
class CustomSceneCollection {

    private _viewer: Viewer;

    private _scenes: Set<CustomScene>;


    constructor( viewer: Viewer )
    {
        this._viewer = viewer;
        this._scenes = new Set();
    }


    get viewer(): Viewer { return this._viewer; }

    get num_scenes(): number { return this._scenes.size; }


    createScene( options: CustomScene.Option = {} ): CustomScene
    {
        const scene = new CustomScene( this, options );
        this._scenes.add( scene );
        return scene;
    }


    removeScene( scene: CustomScene ): void
    {
        if ( !this._scenes.has( scene ) ) {
            throw new Error( "Couldn't find scene: " + scene );
        }

        scene.dispose();
        this._scenes.delete( scene );
    }


    clearScenes(): void
    {
        for ( const scene of this._scenes ) {
            scene.dispose();
        }
        this._scenes.clear();
    }


    draw( stage: RenderStage ): void
    {
        for ( const scene of this._scenes ) {
            scene.draw( stage );
        }
    }


    endFrame(): void
    {
        for ( const scene of this._scenes ) {
            scene.endFrame();
        }
    }
}


export default CustomSceneCollection;
