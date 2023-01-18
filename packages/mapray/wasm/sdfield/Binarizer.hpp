#pragma once

#include "CoverageRatioCount.hpp"
#include "SubPixelSet.hpp"
#include "Bilinear.hpp"
#include "CovImage.hpp"
#include "config.hpp"  // for SUB_PIXEL_DIVS
#include <algorithm>   // for partial_sort()
#include <array>
#include <iterator>    // for input_iterator_tag
#include <type_traits> // for is_copy_constructible_v, is_copy_assignable_v,
                       //     is_nothrow_destructible_v, is_swappable_v
#include <memory>      // for addressof()
#include <cstdint>     // for uint8_t
#include <cstddef>     // for size_t
#include <cassert>


namespace sdfield {


/** @brief 特定画素に対する二値の部分画素を生成
 *
 *  pixel_parts() により、すべての部分画素を得ることができる。
 *
 *  動作は SUB_PIXEL_DIVS >= 2 を前提としている。
 */
class Binarizer {

    using      size_t = std::size_t;
    using spx_coord_t = std::uint8_t;  // サブピクセルの座標型


    /** @brief 単一画素に対するサブピクセルの個数
     */
    static constexpr size_t num_sub_pixels = SUB_PIXEL_DIVS * SUB_PIXEL_DIVS;


    /** サブピクセルのデータ
     */
    struct SubPixelValue {

        /** @brief 補間値
         */
        float value;

        /** @brief サブピクセルの X 座標
         *
         *  範囲は [0, SUB_PIXEL_DIVS - 1]
         */
        spx_coord_t sx;

        /** @brief サブピクセルの Y 座標
         *
         *  範囲は [0, SUB_PIXEL_DIVS - 1]
         */
        spx_coord_t sy;

    };


    /** サブピクセルを計算するためのバッファ型
     */
    using spx_buffer_t = std::array<SubPixelValue, num_sub_pixels>;


    /** @brief 部分画素の情報
     *
     *  Iterable の内部で使用
     */
    struct RectItem {

        /** @brief 開始サブピクセルの X 座標
         *
         *  範囲は [0, SUB_PIXEL_DIVS - 1]
         */
        spx_coord_t  sx;

        /** @brief 開始サブピクセルの Y 座標
         *
         *  範囲は [0, SUB_PIXEL_DIVS - 1]
         */
        spx_coord_t  sy;

        /** @brief 水平方向のサブピクセル数
         *
         *  範囲は [1, SUB_PIXEL_DIVS]
         */
        std::uint8_t hcount;

    };


  public:
    /** @brief 画素の部分矩形領域を表す型
     *
     *  座標系は画素の中心を (0, 0)、左上を (-1/2, -1/2)、右下を
     *  (+1/2, +1/2) とする。
     */
    struct PixelPart {

        /** @brief 矩形の下限座標
         */
        Vec lower;

        /** @brief 矩形の上限座標
         */
        Vec upper;

    };


    class Iterable;


    /** @brief PixelPart インスタンスの入力反復子
     *
     *  仕様は LegacyInputIterator 要件を満たす。
     *
     *  @see https://ja.cppreference.com/w/cpp/named_req/InputIterator
     */
    struct Iterator {

        // std::iterator_traits 用の型定義
        using value_type        = PixelPart;
        using difference_type   = int;
        using reference         = const value_type&;
        using pointer           = const value_type*;
        using iterator_category = std::input_iterator_tag;

        bool
        operator==( Iterator rhs ) const
        {
            // EqualityComparable を満たす比較処理
            // https://ja.cppreference.com/w/cpp/named_req/EqualityComparable

            return this->index_ == rhs.index_;
        }

        bool
        operator!=( Iterator rhs ) const
        {
            // 事前条件: *this, rhs が == の領域内

            return !(*this == rhs);
        }

        reference
        operator*() const
        {
            // 事前条件: *this が逆参照可能

            return owner_->part_;
        }

        pointer
        operator->() const
        {
            // 事前条件: *this が逆参照可能

            return std::addressof( **this );
        }

        Iterator&
        operator++() // ++it
        {
            // 事前条件: *this が逆参照可能
            // 事後条件: *this が逆参照可能または *this が終端
            // 事後条件: *this の以前の値のあらゆるコピーは逆参照可能あることも == の領域内
            //           であることももはや要求されない

            owner_->update_part( ++index_ );

            return *this;
        }

        Iterator
        operator++( int ) // it++
        {
            const auto temp = *this;

            ++(*this);

            // 式 *it++ は value_type に変換可能で、次と同等でなければならない
            //   value_type x = *it;
            //   ++it;
            //   return x;

            // そのため、ここの行で temp, *this は終端でなければ逆参照可能であること

            return temp;
        }

      private:
        Iterator() = default;  // Iterable だけが生成できる

      private:
        Iterable*       owner_;
        difference_type index_;

    friend Iterable;
    };

    // LegacyInputIterator の要件を検査
    static_assert( std::is_copy_constructible_v<Iterator> );
    static_assert( std::is_copy_assignable_v<Iterator> );
    static_assert( std::is_nothrow_destructible_v<Iterator> );
    static_assert( std::is_swappable_v<Iterator> );


    /** pixel_parts() が返すインスタンスの型
     *
     *  for 文により PixelPart インスタンスを列挙することが可能である。
     */
    class Iterable {

      public:
        /** @brief 開始反復子を取得
         */
        Iterator begin()
        {
            Iterator it;
            it.owner_ = this;
            it.index_ = 0;

            // 先頭のアクセスように更新
            if ( it.index_ < num_rects_ ) {
                update_part( it.index_ );
            }

            return it;
        }

        /** @brief 終了反復子を取得
         */
        Iterator end()
        {
            Iterator it;
            it.owner_ = this;
            it.index_ = num_rects_;

            return it;
        }

      private:
        // pixel_parts() から呼び出す
        Iterable( const Binarizer& owner,
                  bool           is_back )
        {
            int index = 0;
            std::uint8_t  hcount;
            spx_coord_t sx_start;

            const auto sps = is_back ? ~owner.sub_pixels_ : owner.sub_pixels_;

            // 状態
            bool inside = false;

            // rects_ の要素を設定
            for ( spx_coord_t sy = 0; sy < SUB_PIXEL_DIVS; ++sy ) {
                for ( spx_coord_t sx = 0; sx < SUB_PIXEL_DIVS; ++sx ) {
                    if ( inside ) {
                        if ( sps.bit_value( sx, sy ) ) {
                            ++hcount;
                        }
                        else {
                            // 矩形完成
                            assert( hcount >= 1 && hcount <= SUB_PIXEL_DIVS );
                            assert( sx_start < SUB_PIXEL_DIVS );
                            assert( sx_start + hcount <= SUB_PIXEL_DIVS );

                            rects_[index++] = { sx_start, sy, hcount };
                            inside = false;
                        }
                    }
                    // outside
                    else {
                        if ( sps.bit_value( sx, sy ) ) {
                            hcount   = 1;
                            sx_start = sx;
                            inside = true;
                        }
                    }
                }
                // 右側に到達
                if ( inside ) {
                    // 矩形完成
                    assert( hcount >= 1 && hcount <= SUB_PIXEL_DIVS );
                    assert( sx_start < SUB_PIXEL_DIVS );
                    assert( sx_start + hcount <= SUB_PIXEL_DIVS );

                    rects_[index++] = { sx_start, sy, hcount };
                    inside = false;
                }
            }

            // 実際に設定された rects_ の要素数
            num_rects_ = index;
        }

        /** index に対する矩形用にメンバー part_ を更新
         */
        void update_part( Iterator::difference_type index )
        {
            const auto& rect = rects_[index];

            constexpr auto scale = vec_elem_t{ 1 } / SUB_PIXEL_DIVS;

            part_.lower.dx = static_cast<vec_elem_t>( rect.sx ) * scale - 0.5f;
            part_.lower.dy = static_cast<vec_elem_t>( rect.sy ) * scale - 0.5f;

            part_.upper.dx = static_cast<vec_elem_t>( rect.sx + rect.hcount ) * scale - 0.5f;
            part_.upper.dy = static_cast<vec_elem_t>( rect.sy + 1           ) * scale - 0.5f;
        }

      private:
        std::array<RectItem, num_sub_pixels> rects_;
        int                              num_rects_;

        /** @brief 参照インスタンス
         *
         *  反復子により参照する PixelPart インスタンスである。
         *
         *  入力反復子用なので反復子のインクリメント後は内容が失われて
         *  も問題ない。
         */
        PixelPart part_;

    friend Binarizer;
    friend Iterator;
    };


  public:
    /** @brief 初期化
     */
    Binarizer( const CovImage& image,
               CovImage::coord_t   x,
               CovImage::coord_t   y )
        : image_{ image },
          x_{ x },
          y_{ y }
    {
        assert( SUB_PIXEL_DIVS >= 2 );
        assert( x >= 0 && y >= 0 );

        // 被覆率の補間値を取得
        spx_buffer_t spx_buffer;
        get_spx_buffer( spx_buffer );

        // 被覆率に対するサブピクセルの個数
        const auto ratio_count = CoverageRatioCount::get( image.get_pixel( x, y ) );

        sort_spx_buffer( spx_buffer, ratio_count );
        setup_sub_pixels( spx_buffer, ratio_count );
    }


    /** @brief PixelPart 反復可能オブジェクトを取得
     *
     *  this が対象とする画素の、すべての PixelPart インスタンスを反復
     *  できるオブジェクトを返す。
     *
     *  @param is_back  表面のとき false, 裏面のとき true
     */
    Iterable pixel_parts( bool is_back ) const
    {
        return Iterable{ *this, is_back };
    }


  private:
    /** @brief spx_buffer を設定
     *
     *  spx_buffer に SubPixelValue の配列を設定する。
     */
    void
    get_spx_buffer( spx_buffer_t& buffer ) const
    {
        const Bilinear interpolation { image_, x_, y_ };

        size_t index = 0;

        for ( spx_coord_t sy = 0; sy < SUB_PIXEL_DIVS; ++sy ) {
            for ( spx_coord_t sx = 0; sx < SUB_PIXEL_DIVS; ++sx ) {
                auto& spx = buffer[index++];
                spx.value = interpolation.sample( sx, sy );
                spx.sx    = sx;
                spx.sy    = sy;
            }
        }
    }


    /** @brief spx_buffer を上位 count を前方に移動
     */
    static void
    sort_spx_buffer( spx_buffer_t& buffer,
                     size_t         count )
    {
        using std::partial_sort;

        // 補間値の降順ソート
        partial_sort( buffer.begin(),
                      buffer.begin() + count,
                      buffer.end(),
                      []( const auto& a,
                          const auto& b ) {
                          return b.value < a.value;
                      } );
    }


    /** @brief sub_pixels_ を初期化
     */
    void
    setup_sub_pixels( const spx_buffer_t& buffer,
                      size_t               count )
    {
        SubPixelSet sps {};

        // サブピクセルを設定
        for ( size_t i = 0; i < count; ++i ) {
            const auto& item = buffer[i];
            sps = sps.union_with( item.sx, item.sy );
        }

        sub_pixels_ = sps;
    }


  private:
    const CovImage& image_;
    const CovImage::coord_t x_;
    const CovImage::coord_t y_;

    /** すべてのサブピクセル値データ
     */
    SubPixelSet sub_pixels_;

};


} // namespace sdfield
