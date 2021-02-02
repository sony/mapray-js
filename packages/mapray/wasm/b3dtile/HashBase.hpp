#pragma once

#include <vector>
#include <limits>
#include <cmath>    // for ceil()
#include <cassert>
#include <cstdint>  // for uint32_t
#include <cstddef>  // for size_t


namespace b3dtile {

/** @brief ハッシュ表を実装するためのクラス
 *
 *  このクラスを private 継承してハッシュ表を実装する。
 *
 *  - キーの型は std::size_t (範囲は [0, 2^32-2])
 *  - 削除操作なし
 *  - 反復子なし
 *
 *  Bucket 型の要件
 *
 *  - std::size_t 型の public メンバー変数 key を持つ
 *  - Bucket{ k } で key メンバー変数が k であるインスタンスを生成
 *
 *  tparam Bucket バケットの型
 */
template<typename Bucket>
class HashBase {

  protected:
    using    key_t = std::size_t;
    using bucket_t = Bucket;


  private:
    using size_t = std::size_t;

    static constexpr size_t INITIAL_POW     = 1;     // n >= 1
    static constexpr size_t INITIAL_SIZE    = 1u << INITIAL_POW;  // 初期バケット数 (2^n)
    static constexpr auto   MAX_LOAD_FACTOR = 0.75;  // <= 1
    static constexpr auto   NO_ENTRY_KEY    = static_cast<key_t>( -1 );

    static constexpr size_t MAX_BITS = std::numeric_limits<std::uint32_t>::digits;
    static constexpr size_t MOD_MASK = static_cast<std::uint32_t>( -1 );


  protected:
    /** @brief 初期化
     */
    HashBase() :
        buckets_{ INITIAL_SIZE, Bucket{ NO_ENTRY_KEY } },
        mum_entries_{ 0 },
        shift_{ MAX_BITS - INITIAL_POW },
        thresh_{ static_cast<size_t>( std::ceil( INITIAL_SIZE * MAX_LOAD_FACTOR ) ) }
    {}


    /** @brief 要素数
     */
    std::size_t
    size() const
    {
        return mum_entries_;
    }


    /** @brief insert() 実装用のメソッド
     *
     *  key に対応するバケットへの参照を返す。
     *
     *  バケットにキーがが登録されているかどうかを is_no_entry() で確かめて、登録
     *  されていなければバケットを設定しなければならない。
     */
    Bucket&
    ref_bucket( key_t key )
    {
        assert( key != NO_ENTRY_KEY );

        if ( mum_entries_ == thresh_ ) {
            // 要素数が閾値に達したのでバケットを拡大
            extend_buckets();
        }
        assert( buckets_.size() > mum_entries_ );

        const size_t hash = hash_uint32( key );
        const size_t mask = MOD_MASK >> shift_;

        for ( size_t i = 0 ;; ++i ) {
            const size_t index = (hash + i) & mask;

            auto& bucket = buckets_[index];

            // ※ buckets_ に空きがあるので、必ずどちらかの if にたどり着く

            if ( bucket.key == NO_ENTRY_KEY ) {
                // key は存在しないので新規に挿入
                ++mum_entries_;
                return bucket;
            }
            else if ( bucket.key == key ) {
                // key はすでに存在しているので挿入しない
                return bucket;
            }
        }
    }


    /** @brief bucket は登録なしであるか？
     */
    static bool
    is_no_entry( const bucket_t& bucket )
    {
        return bucket.key == NO_ENTRY_KEY;
    }


  private:
    /** @brief ハッシュ関数
     */
    size_t
    hash_uint32( size_t key ) const
    {
        // Knuth の方法
        //  a = 2^32 * (sqrt(5) - 1) / 2
        constexpr size_t a = 2654435769;

        return (a * key) >> shift_;
    }


    void
    extend_buckets()
    {
        const size_t new_size = 2 * buckets_.size();
        assert( new_size >= mum_entries_ );

        // buckets_ を長さ new_size の未登録の配列にクリアし、以前の配列を
        // old_buckets に設定する
        std::vector<Bucket> old_buckets{ new_size, Bucket{ NO_ENTRY_KEY } };
        buckets_.swap( old_buckets );

        // サイズ関連のプロパティを更新
        shift_ -= 1;
        thresh_ = static_cast<size_t>( std::ceil( new_size * MAX_LOAD_FACTOR ) );
        assert( mum_entries_ < thresh_ );

        // old_buckets のすべての登録バケットを buckets_ に挿入
        for ( const auto& bucket : old_buckets ) {
            if ( bucket.key != NO_ENTRY_KEY ) {
                insert_new_key( bucket );
            }
        }
    }


    void
    insert_new_key( const Bucket& bucket )
    {
        const size_t hash = hash_uint32( bucket.key );
        const size_t mask = MOD_MASK >> shift_;

        for ( size_t i = 0 ;; ++i ) {
            const size_t index = (hash + i) & mask;

            if ( buckets_[index].key == NO_ENTRY_KEY ) {
                // index は使われていないので、ここに登録する
                // ※ buckets_ に空きがあれば、必ずここにたどり着く
                buckets_[index] = bucket;
                break;
            }
        }
    }


  private:
    std::vector<Bucket> buckets_;  // サイズは 2^n
    size_t          mum_entries_;  // 登録された要素数

    size_t  shift_;  // ハッシュ値と剰余マスクの捨てる下位数
    size_t thresh_;  // mum_entries_ == thresh_ のときバケット数を拡大

};

} // namespace b3dtile
