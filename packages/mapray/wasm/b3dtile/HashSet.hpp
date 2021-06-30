#pragma once

#include "HashBase.hpp"
#include <cstddef>  // for size_t


namespace b3dtile {

namespace impl_ {

struct HashSetBucket {

    std::size_t key;

    explicit
    HashSetBucket( std::size_t k )  // Bucket 型の要件
        : key{ k } {}

};

}


/** @brief ハッシュ表による値の集合
 *
 *  値は 0 から 2^32 - 2 の符号なし整数である。
 */
class HashSet : HashBase< impl_::HashSetBucket > {

    using   base_t = HashBase< impl_::HashSetBucket >;
    using bucket_t = typename base_t::bucket_t;

  public:
    /** @brief 値の型
     */
    using value_t = typename base_t::key_t;


    /** @brief 要素数
     */
    using base_t::size;


  public:
    /** @brief 集合に値を挿入
     *
     *  集合に値 value が登録されていなければ、value を集合に追加する。そして
     *  true を返す。
     *
     *  すでに値 value が集合に登録されていれば、集合には何も登録しない。そして
     *  false を返す。
     */
    bool
    insert( const value_t& value )
    {
        const auto& key = value;

        auto& bucket = base_t::ref_bucket( key );

        if ( base_t::is_no_entry( bucket ) ) {
            bucket = bucket_t{ key };
            return true;
        }
        else {
            return false;
        }
    }

};

} // namespace b3dtile
