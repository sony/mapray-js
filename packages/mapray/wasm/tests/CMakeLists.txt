cmake_minimum_required(VERSION 3.10)

enable_language(CXX)
set(CMAKE_CXX_STANDARD 17)          # C++ 17
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)       # GNU 拡張を禁止

project(unit_test)


# 単体テストのソースファイル
set(unit_test_src
  unit_tests.cpp
  b3dtile_tests.cpp
  ../b3dtile/Tile.cpp
  ../b3dtile/Tile/Clipper.cpp
  sdfield_tests.cpp
  ../sdfield/Converter.cpp
  ../sdfield/Grid.cpp
)


set(EXTRA_LIBS)

if(CMAKE_COMPILER_IS_GNUCC)
  if (CMAKE_CXX_COMPILER_VERSION VERSION_LESS "8.4")
    message(FATAL_ERROR "g++ version must be at least 8.4!")
  endif()
endif()

# conan 関連の設定
include(${CMAKE_BINARY_DIR}/conanbuildinfo.cmake)
conan_basic_setup()

# コンパイラの警告を厳しくする
if(MSVC)
  if(CMAKE_CXX_FLAGS MATCHES "/W[0-4]")
    string(REGEX REPLACE "/W[0-4]" "/W4" CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS}")
  else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /W4")
  endif()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /permissive- /Za")  # 標準準拠モード、言語拡張機能の無効化
elseif(CMAKE_COMPILER_IS_GNUCC OR CMAKE_COMPILER_IS_GNUCXX)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -pedantic")
endif()

# std::filesystem ライブラリを追加
if(CMAKE_COMPILER_IS_GNUCXX)
  set(EXTRA_LIBS ${EXTRA_LIBS} stdc++fs)
endif()

add_executable(unit_test ${unit_test_src})
target_link_libraries(unit_test ${CONAN_LIBS} ${EXTRA_LIBS})
target_include_directories(unit_test PRIVATE "../common")
