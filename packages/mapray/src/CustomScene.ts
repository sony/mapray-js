import type RenderStage from "./RenderStage";
import type CustomSceneCollection from "./CustomSceneCollection";


/**
 * カスタム描画シーン
 *
 * mapray 本体の外で実装された runtime の描画処理を Viewer に接続する。
 *
 * @see {@link CustomSceneCollection}
 */
class CustomScene {

    private _owner: CustomSceneCollection;

    private _hooks: CustomScene.Hooks;

    private _visibility: boolean;

    private _destroyed: boolean;


    constructor( owner: CustomSceneCollection, options: CustomScene.Option = {} )
    {
        this._owner = owner;
        this._hooks = {
            draw: options.draw,
            endFrame: options.endFrame,
            destroy: options.destroy,
        };
        this._visibility = options.visibility ?? true;
        this._destroyed = false;
    }


    get owner(): CustomSceneCollection { return this._owner; }

    get visibility(): boolean { return this._visibility; }


    setVisibility( visibility: boolean ): void
    {
        this._visibility = visibility;
    }


    destroy(): void
    {
        if ( this._destroyed ) {
            return;
        }

        this._owner.removeScene( this );
    }


    draw( stage: RenderStage ): void
    {
        if ( this._destroyed || !this._visibility ) {
            return;
        }

        this._hooks.draw?.( stage, this );
    }


    endFrame(): void
    {
        if ( this._destroyed ) {
            return;
        }

        this._hooks.endFrame?.( this );
    }


    dispose(): void
    {
        if ( this._destroyed ) {
            return;
        }

        this._destroyed = true;
        this._hooks.destroy?.( this );
    }
}


namespace CustomScene {


export interface Hooks {
    draw?: ( stage: RenderStage, scene: CustomScene ) => void;
    endFrame?: ( scene: CustomScene ) => void;
    destroy?: ( scene: CustomScene ) => void;
}


export interface Option extends Hooks {
    visibility?: boolean;
}


}


export default CustomScene;
