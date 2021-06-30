#pragma once

#include <array>
#include <cstddef>  // for size_t


namespace b3dtile {

/** @brief Dim 次元直方体
 *
 *  基本的に lower[i] < upper[i] であること。
 *
 *  upper 上にある点は直方体に含まれない (半開領域) と考える。
 *
 *  @tparam EType  座標の要素型
 *  @tparam Dim    座標の次元数
 */
template<typename  EType,
         std::size_t Dim>
class Rect {

  public:
    using position_t = std::array<EType, Dim>;
    using element_t  = EType;


  public:
    /** @brief 下限
     */
    position_t lower;


    /** @brief 上限
     */
    position_t upper;


  public:
    /** @brief 既定値で初期化
     *
     *  文脈によって lower と upper は不定値になる。
     */
    Rect() = default;


    /** @brief 下限と上限で初期化
     */
    constexpr
    Rect( const position_t& lower_,
          const position_t& upper_ )
        : lower{ lower_ },
          upper{ upper_ } {}


    /** @brief 原点と寸法から立方体を生成
     */
    static constexpr Rect
    create_cube( const position_t& origin,
                 const element_t&    size )
    {
        position_t upper = origin;

        for ( size_t i = 0; i < Dim; ++i ) {
            upper[i] += size;
        }

        return Rect{ origin, upper };
    }


    /** @brief 寸法の有効性を検査
     *
     *  0 から Dim の i に対して、すべて lower[i] < upper[i] のとき true を返す。
     *  それ以外のとき false を返す。
     */
    constexpr bool
    is_valid_size() const
    {
        for ( size_t i = 0; i < Dim; ++i ) {
            if ( lower[i] >= upper[i] ) {
                return false;
            }
        }
        return true;
    }


    /** @brief this と rect は交差するか？
     *
     *  @pre is_valid_size()
     */
    constexpr bool
    is_cross( const Rect& rect ) const
    {
        for ( size_t i = 0; i < Dim; ++i ) {
            const auto& l0 = this->lower[i];
            const auto& u0 = this->upper[i];

            const auto& l1 = rect.lower[i];
            const auto& u1 = rect.upper[i];

            if ( l0 >= u1 || u0 <= l1 ) {
                // 交差しない
                return false;
            }
        }

        // 交差する
        return true;
    }


    /** @brief this は rect を包含するか？
     *
     *  @pre is_valid_size()
     */
    constexpr bool
    includes( const Rect& rect ) const
    {
        for ( size_t i = 0; i < Dim; ++i ) {
            const auto& l0 = this->lower[i];
            const auto& u0 = this->upper[i];

            const auto& l1 = rect.lower[i];
            const auto& u1 = rect.upper[i];

            if ( l1 < l0 || u1 > u0 ) {
                // 包含しない
                return false;
            }
        }

        // 包含する
        return true;
    }


    /** @brief 直方体の中心を取得
     *
     *  @pre is_valid_size()
     */
    constexpr position_t
    get_center() const
    {
        position_t pos;

        for ( size_t i = 0; i < Dim; ++i ) {
            pos[i] = (lower[i] + upper[i]) / static_cast<EType>( 2 );
        }

        return pos;
    }

};

} // namespace b3dtile
