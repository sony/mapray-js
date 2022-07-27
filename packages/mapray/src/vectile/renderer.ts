import GLEnv from "../GLEnv";
import Primitive from "../Primitive";
import RenderStage from "../RenderStage";


/**
 * ベクトルタイルの描画処理
 */
export class Renderer {

    /**
     * @param stage      - 現行のレンダリングステージ
     * @param primitives - 描画対象の描画プリミティブ
    */
    constructor( stage:      RenderStage,
                 primitives: Iterable<Primitive> )
    {
        // プリミティブの振り分け
        const op_prims: Primitive[] = [];
        const tp_prims: Primitive[] = [];

        for ( const primitive of primitives ) {
            if ( !primitive.isVisible( stage ) ) {
                // 不可視なので描画を省略
                continue;
            }
            // ここで primitive.sort_z が設定されている

            if ( primitive.isTranslucent( stage ) ) {
                tp_prims.push( primitive );
            }
            else {
                op_prims.push( primitive );
            }
        }

        // プロパティを初期化
        this._glenv = stage.glenv;
        this._op_primitives = op_prims;
        this._tp_primitives = tp_prims;
    }


    /**
     * ベクトルタイルの描画を実行
     */
    run( stage: RenderStage ): void
    {
        this._draw_opaque_primitives( stage );
        this._draw_translucent_primitives( stage );
    }


    /**
     * 不透明プリミティブを整列してから描画
     */
    private _draw_opaque_primitives( stage: RenderStage ): void
    {
        const primitives = this._op_primitives;

        // 不透明プリミティブの整列: 近接 -> 遠方 (Z 降順)
        primitives.sort( function( a, b ) { return b.sort_z - a.sort_z; } );

        const gl = this._glenv.context;
        gl.disable( gl.BLEND );
        gl.depthMask( true );

        for ( const primitive of primitives ) {
            primitive.draw( stage );
        }
    }


    /**
     * 半透明プリミティブを整列してから描画
     */
    private _draw_translucent_primitives( stage: RenderStage ): void
    {
        const primitives = this._tp_primitives;

        // 半透明プリミティブの整列: 遠方 -> 近接 (Z 昇順)
        primitives.sort( function( a, b ) { return a.sort_z - b.sort_z; } );

        const gl = this._glenv.context;

        // C = Cs + (1 - As) Cd
        gl.blendFuncSeparate( gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE );

        if ( stage.getRenderTarget() === RenderStage.RenderTarget.SCENE ) {
            gl.enable( gl.BLEND );
        }
        else {
            gl.disable( gl.BLEND );
        }

        gl.depthMask( false );

        for ( const primitive of primitives ) {
            primitive.draw( stage );
        }

        // 既定状態に戻す
        gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE );
        gl.disable( gl.BLEND );
        gl.depthMask( true );
    }


    private readonly _glenv: GLEnv;

    // 不透明プリミティブ
    private readonly _op_primitives: Primitive[];

    // 半透明プリミティブ
    private readonly _tp_primitives: Primitive[];

}
