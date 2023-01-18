cmake_minimum_required(VERSION 3.10)

enable_language(CXX)
set(CMAKE_CXX_STANDARD 17)          # C++ 17
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)       # GNU 拡張を禁止

project(sdfield)

# C++ 例外が必要なときは use_cxx_exception を設定する
# 現在の WASM は効率が悪いらしいのでデフォルトで無効
# (set use_cxx_exception 1)

# メインターゲットのソースファイル
set(main_target_src
  sdfield.cpp
  Converter.cpp
  Grid.cpp
)

# コンパイル構成の共通設定
set(cxx_flags_common "-Wall -Wextra -pedantic --no-entry --emit-symbol-map")

# Emscripten 共通設定 (-s オプション)
# 詳細は $EMSDK/upstream/emscripten/src/settings.js
set(em_settings_common
  ENVIRONMENT=web         # 実行環境 (web, worker, node など)
  INITIAL_MEMORY=256KB    # 初期メモリーサイズ (変更可)
  TOTAL_STACK=32KB        # スタックサイズ (変更可)
  MODULARIZE=1
  EXPORT_ES6=1
  USE_ES6_IMPORT_META=0
  ALLOW_MEMORY_GROWTH=1
  MEMORY_GROWTH_GEOMETRIC_STEP=0.5  # 1.5 倍単位でメモリー増加 (変更可)
  MEMORY_GROWTH_GEOMETRIC_CAP=0
  ALLOW_TABLE_GROWTH=1
  EXTRA_EXPORTED_RUNTIME_METHODS='["addFunction"]'
)

# cxx_flags_common に EM 共通設定を追加
foreach(name IN LISTS em_settings_common)
  set(cxx_flags_common "${cxx_flags_common} -s ${name}")
endforeach(name)

# cxx_flags_common に C++ 例外関連の設定を追加
if (use_cxx_exception)
  set(cxx_exception_flags "-s DISABLE_EXCEPTION_CATCHING=0")
else()
  set(cxx_exception_flags "-s DISABLE_EXCEPTION_CATCHING=1 -fno-exceptions")
endif()

set(cxx_flags_common "${cxx_flags_common} ${cxx_exception_flags}")

# ツールセットのフラグを設定
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -g1 -flto -mnontrapping-fptoint -DNDEBUG ${cxx_flags_common}")
unset(CMAKE_EXE_LINKER_FLAGS_RELEASE)

file(RELATIVE_PATH source_map_dir "${CMAKE_CURRENT_SOURCE_DIR}/.." "${CMAKE_CURRENT_BINARY_DIR}")

set(CMAKE_CXX_FLAGS_DEBUG "-O0 -g4 \
-s STACK_OVERFLOW_CHECK=2 \
-s SAFE_HEAP=1 \
-s DEMANGLE_SUPPORT=1 \
--source-map-base='http://localhost:8080/${source_map_dir}/' \
${cxx_flags_common}")
unset(CMAKE_EXE_LINKER_FLAGS_DEBUG)

set(main_target ${PROJECT_NAME})
set(basename ${PROJECT_NAME})

# ターゲットの設定
add_executable(${main_target} ${main_target_src})
target_link_libraries(${main_target})
target_include_directories(${main_target} PRIVATE "../common")

# 消去対象を追加
set_property(DIRECTORY APPEND PROPERTY ADDITIONAL_MAKE_CLEAN_FILES
  "${basename}.wasm"
  "${basename}.js.symbols"
  "${basename}.wasm.map"
)

# .wasm を逆アセンブル
add_custom_target(wast DEPENDS "${basename}.wat")
add_custom_command(OUTPUT "${basename}.wat"
  COMMAND "$ENV{EMSDK}/upstream/bin/wasm-dis" "${basename}.wasm" --output="${basename}.wat"
  DEPENDS ${main_target})

# .js と .wasm のインストール
set(CMAKE_INSTALL_PREFIX "../../../src/wasm")
install(TARGETS ${main_target} DESTINATION ".")
install(FILES "${CMAKE_CURRENT_BINARY_DIR}/${basename}.wasm" DESTINATION ".")
