Hello, and thanks in advance for contributing to maprayJS. Here's how we work.
We haven't written a contributor guide or coding rules yet, so we will continue to enhance the content in the future.
This document first explains how to build maprayJS.


# Preparing your Development Environment

Following packages are required to build maprayJS.

- node (v16 or later)
- yarn
  - Yarn workspace is used in maprayJS.
  - Note: on MacOS it is often convenient to install node and yarn with brew


# Build


## Clone the repository

```bash
git clone https://github.com/sony/mapray-js.git
```


## Build wasm module before building maprayJS

To build maprayJS, you need to build the wasm module first.
Follow build instraction part of the [README](./packages/mapray/wasm/README.org) to install and build wasm module.


## Build maprayJS


### install dependencies

Dependent packages are installed under ui and mapray packages.

```bash
cd mapray-js
yarn install
```


### build

A standalone build allows you to turn the contents of this repository into js files, mapray.js, maprayui.js, and mapray.css files that can be included on html pages through umd and es modules.

```bash
yarn build
```

Following files will be generated in each directory.

| path                  | summary                        |
|-----------------------|--------------------------------|
| /packages/mapray/dist | build result of mapray package |
| /packages/ui/dist     | build result of ui package     |
| /doc/typedoc          | API Referende                  |


### API Reference

You can create integrated document accross workspaces with the following command.

```bash
yarn run typedoc
```

The document is generated in `/doc/typedoc`.


### Other Commands

You can also use following commands.

```bash
yarn run <command>
```

| command             | summary                                       |
|---------------------|-----------------------------------------------|
| build               | run mapray, ui, css and typedoc               |
| mapray              | build mapray package                          |
| mapray-watch        | build and watch mapray package                |
| ui                  | build ui package                              |
| ui-watch            | build and watch ui package                    |
| css                 | build css for ui package                      |
| typedoc             | generate typedoc(for SDK user)                |
| typedoc-watch       | generate typedoc(for SDK user) and watch      |
| typedoc-devel       | generate typedoc(for SDK developer)           |
| typedoc-devel-watch | generate typedoc(for SDK developer) and watch |
| test                | execute test                                  |


# Serving the application for development

You can use debug applications under [debug](./debug/) for development.


# Contributing by Pull Request

We appreciate contributors in the community, that are willing to improve maprayJS.
Please create a pull request of your development branch to master branch.
Our maintainers will then review your changes.
