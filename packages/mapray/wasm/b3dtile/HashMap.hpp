#pragma once

#include "HashBase.hpp"
#include <utility>  // for pair
#include <cstddef>  // for size_t


namespace b3dtile {

namespace impl_ {

template<typename ValueType>
struct HashMapBucket {

    std::size_t key;
    ValueType value;

    explicit
    HashMapBucket( std::size_t k )  // Bucket 型の要件
        : key{ k } {}

    HashMapBucket( std::size_t k, const ValueType& v )
        : key{ k }, value{ v } {}

};

}


/** @brief ハッシュ表による キー/値 の辞書
 *
 *  @tparam ValueType  値の型
 */
template<typename ValueType>
class HashMap : HashBase< impl_::HashMapBucket<ValueType> > {

    using   base_t = HashBase< impl_::HashMapBucket<ValueType> >;
    using bucket_t = typename base_t::bucket_t;

  public:
    /** @brief キーの型
     */
    using key_t = typename base_t::key_t;


    /** @brief 値の型
     */
    using value_t = ValueType;


    /** @brief 要素数
     */
    using base_t::size;


  public:
    /** @brief 辞書に要素を挿入
     *
     *  辞書にキー key の要素が登録されていなければ、そのキーで値 value を辞書に
     *  追加する。そして value と true の対を返す。
     *
     *  すでに辞書にキー key の要素が登録されていれば、辞書には何も登録しない。
     *  そしてすでに登録されてる値と false の対を返す。
     */
    std::pair<value_t, bool>
    insert( key_t            key,
            const value_t& value )
    {
        auto& bucket = base_t::ref_bucket( key );

        if ( base_t::is_no_entry( bucket ) ) {
            bucket = bucket_t{ key, value };
            return { value, true };
        }
        else {
            return { bucket.value, false };
        }
    }

};

} // namespace b3dtile
