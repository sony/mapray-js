#pragma once

#include <array>
#include <complex>  // for norm()
#include <cmath>    // for sqrt()
#include <cstddef>  // for size_t


namespace b3dtile {

/** @brief ベクトル型
 *
 *  @tparam CompoType  ベクトルの要素の型
 *  @tparam Dimension  ベクトルの次数 (>= 2)
 */
template<typename    CompoType,
         std::size_t Dimension>
class Vector {

  public:
    static constexpr std::size_t NUM_COMPOS = Dimension;

    using compo_t = CompoType;
    using array_t = std::array<compo_t, NUM_COMPOS>;


  public:
    /** @brief 既定の初期化
     *
     *  @note 文脈により要素が未初期化になることがある。
     */
    constexpr
    Vector()
    { /* メンバーは明示的に初期化しない */ }


    /** @brief 任意要素型の Vector オブジェクトから初期化
     */
    template<typename SrcCompoType>
    constexpr
    Vector( const Vector<SrcCompoType, Dimension>& src )
    {
        cast_copy_components( src );
    }


    /** @brief std::array オブジェクトから初期化
     */
    template<typename SrcCompoType>
    constexpr
    Vector( const std::array<SrcCompoType, Dimension>& src )
    {
        cast_copy_components( src );
    }


    /** @brief 要素列から初期化
     */
    template<typename... Args>
    constexpr
    Vector( const compo_t& arg1, const compo_t& arg2, const Args&... args )
        : compos_{ arg1, arg2, args... } {}


    /** @brief 零ベクトルを取得
     */
    static constexpr Vector
    zero()
    {
        Vector temp;

        for ( std::size_t i = 0; i < NUM_COMPOS; ++i ) {
            temp[i] = static_cast<compo_t>( 0 );
        }

        return temp;
    }


    /** @brief 基底ベクトルを取得
     *
     *  第 i 要素が 1, それ以外の要素が 0 のベクトルを取得する。
     */
    static constexpr Vector
    basis( std::size_t i )
    {
        Vector temp;

        for ( std::size_t j = 0; j < NUM_COMPOS; ++j ) {
            temp[j] = static_cast<compo_t>( (j == i) ? 1 : 0 );
        }

        return temp;
    }


    /** @brief 任意要素型の Vector オブジェクトを代入
     */
    template<typename SrcCompoType>
    constexpr Vector&
    operator=( const Vector<SrcCompoType, Dimension>& rhs )
    {
        cast_copy_components( rhs );
        return *this;
    }


    /** @brief std::array オブジェクトを代入
     */
    template<typename SrcCompoType>
    constexpr Vector&
    operator=( const std::array<SrcCompoType, Dimension>& rhs )
    {
        cast_copy_components( rhs );
        return *this;
    }


    /** @brief std::array オブジェクトへの変換
     */
    operator array_t() const
    {
        return compos_;
    }


    /** @brief const 要素への参照を取得
     *
     *  @note 参照が有効な期間は this と同じ。
     */
    constexpr const compo_t&
    operator[]( std::size_t i ) const
    {
        return compos_[i];
    }


    /** @brief 要素への参照を取得
     *
     *  @note 参照が有効な期間は this と同じ。
     */
    constexpr compo_t&
    operator[]( std::size_t i )
    {
        const auto& cref = *this;
        return const_cast<compo_t&>( cref[i] );
    }


    constexpr auto
    begin()
    {
        return compos_.begin();
    }


    constexpr auto
    begin() const
    {
        return compos_.begin();
    }


    constexpr auto
    end()
    {
        return compos_.end();
    }


    constexpr auto
    end() const
    {
        return compos_.end();
    }


    /** @brief 要素数を取得
     */
    constexpr std::size_t
    size() const noexcept
    {
        return NUM_COMPOS;
    }


    constexpr Vector&
    operator*=( const compo_t& scalar )
    {
        for ( std::size_t i = 0; i < Dimension; ++i ) {
            (*this)[i] *= scalar;
        }

        return *this;
    }


    constexpr Vector&
    operator/=( const compo_t& scalar )
    {
        for ( std::size_t i = 0; i < Dimension; ++i ) {
            (*this)[i] /= scalar;
        }

        return *this;
    }


    constexpr Vector&
    operator+=( const Vector& rhs )
    {
        for ( std::size_t i = 0; i < Dimension; ++i ) {
            (*this)[i] += rhs[i];
        }

        return *this;
    }


    constexpr Vector&
    operator-=( const Vector& rhs )
    {
        for ( std::size_t i = 0; i < Dimension; ++i ) {
            (*this)[i] -= rhs[i];
        }

        return *this;
    }


  private:
    template<typename TableType>
    constexpr void
    cast_copy_components( const TableType& src )
    {
        for ( std::size_t i = 0; i < NUM_COMPOS; ++i ) {
            compos_[i] = static_cast<compo_t>( src[i] );
        }
    }


  private:
    array_t compos_;

};


/** @brief Type に適合する Vector 型を取得
 *
 *  type メンバーが Vector 型になる。
 */
template<typename Type>
struct MatchedVector;


template<typename CompoType, std::size_t Dimension>
struct MatchedVector<Vector<CompoType, Dimension>>
{
    using type = Vector<CompoType, Dimension>;
};


template<typename CompoType, std::size_t Dimension>
struct MatchedVector<std::array<CompoType, Dimension>>
{
    using type = Vector<CompoType, Dimension>;
};


/** @brief 引数を適合する Vector 型へ変換
 */
template<typename CompoType, std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
to_vector( const Vector<CompoType, Dimension>& val )
{
    return val;
}


/** @brief 引数を適合する Vector 型へ変換
 */
template<typename CompoType, std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
to_vector( const std::array<CompoType, Dimension>& val )
{
    return val;
}


/** @brief ベクトルを拡張
 *
 *  vec の後に scalar を付け足して vec より 1 次元大きいベクトルを生成する。
 */
template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension + 1>
extend( const Vector<CompoType, Dimension>& vec,
        const CompoType&                 scalar )
{
    Vector<CompoType, Dimension + 1> temp;

    std::size_t i = 0;  // C++20 未満の constexpr 関数は初期化が必要
    for ( ; i < Dimension; ++i ) {
        temp[i] = vec[i];
    }
    temp[i] = scalar;

    return temp;
}


/** @brief ベクトルを縮小
 *
 *  vec の最後の要素を削除して vec より 1 次元小さいベクトルを生成する。
 */
template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension - 1>
shorten( const Vector<CompoType, Dimension>& vec )
{
    Vector<CompoType, Dimension - 1> temp;

    for ( std::size_t i = 0; i < Dimension - 1; ++i ) {
        temp[i] = vec[i];
    }

    return temp;
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
operator+( const Vector<CompoType, Dimension>& vec )
{
    return vec;
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
operator-( const Vector<CompoType, Dimension>& vec )
{
    Vector<CompoType, Dimension> temp;

    for ( std::size_t i = 0; i < Dimension; ++i ) {
        temp[i] = -vec[i];
    }

    return temp;
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr bool
operator==( const Vector<CompoType, Dimension>& lhs,
            const Vector<CompoType, Dimension>& rhs )
{
    for ( std::size_t i = 0; i < Dimension; ++i ) {
        if ( lhs[i] != rhs[i] ) {
            return false;
        }
    }

    return true;
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr bool
operator!=( const Vector<CompoType, Dimension>& lhs,
            const Vector<CompoType, Dimension>& rhs )
{
    return !(lhs == rhs);
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
operator*( const Vector<CompoType, Dimension>& vec,
           const CompoType&                 scalar )
{
    auto temp = vec;
    return temp *= scalar;
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
operator*( const CompoType&                 scalar,
           const Vector<CompoType, Dimension>& vec )
{
    return vec * scalar;
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
operator/( const Vector<CompoType, Dimension>& vec,
           const CompoType&                 scalar )
{
    auto temp = vec;
    return temp /= scalar;
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
operator+( const Vector<CompoType, Dimension>& lhs,
           const Vector<CompoType, Dimension>& rhs )
{
    auto temp = lhs;
    return temp += rhs;
}


template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
operator-( const Vector<CompoType, Dimension>& lhs,
           const Vector<CompoType, Dimension>& rhs )
{
    auto temp = lhs;
    return temp -= rhs;
}


/** @brief 内積を計算
 */
template<typename    CompoType,
         std::size_t Dimension>
constexpr CompoType
dot( const Vector<CompoType, Dimension>& lhs,
     const Vector<CompoType, Dimension>& rhs )
{
    auto temp = static_cast<CompoType>( 0 );

    for ( std::size_t i = 0; i < Dimension; ++i ) {
        temp += lhs[i] * rhs[i];
    }

    return temp;
}


/** @brief 外積を計算
 */
template<typename CompoType>
constexpr Vector<CompoType, 3>
cross( const Vector<CompoType, 3>& lhs,
       const Vector<CompoType, 3>& rhs )
{
    return Vector<CompoType, 3>{ lhs[1]*rhs[2] - lhs[2]*rhs[1],
                                 lhs[2]*rhs[0] - lhs[0]*rhs[2],
                                 lhs[0]*rhs[1] - lhs[1]*rhs[0] };
}


/** @brief ノルムを計算
 *
 *  要素の絶対値の平方の和の平方根を計算する。
 */
template<typename    CompoType,
         std::size_t Dimension>
constexpr CompoType
norm( const Vector<CompoType, Dimension>& vec )
{
    using std::sqrt;
    using std::norm;

    auto temp = static_cast<CompoType>( 0 );

    for ( std::size_t i = 0; i < Dimension; ++i ) {
        temp += norm( vec[i] );
    }

    return sqrt( temp );
}


/** @brief 正規化ベクトルを計算
 *
 *  @pre vec は非零ベクトル
 */
template<typename    CompoType,
         std::size_t Dimension>
constexpr Vector<CompoType, Dimension>
normalize( const Vector<CompoType, Dimension>& vec )
{
    return vec / norm( vec );
}

} // namespace b3dtile
