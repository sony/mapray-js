MAPRAY_JS_DIR = "../packages/mapray"
UI_DIR = "../packages/ui"

.PHONY: release-mapray-patch
release-mapray-patch: update-mapray-patch-version build-mapray-js setup-for-mapray-production-deploy ;

.PHONY: release-mapray-minor
release-mapray-minor: update-mapray-minor-version build-mapray-js setup-for-mapray-production-deploy ;

.PHONY: release-mapray-major
release-mapray-major: update-mapray-major-version build-mapray-js setup-for-mapray-production-deploy ;

.PHONY: update-mapray-patch-version
update-mapray-patch-version:
	./scripts/update_package_json.sh -t mapray -v patch

.PHONY: update-mapray-minor-version
update-mapray-minor-version:
	./scripts/update_package_json.sh -t mapray -v minor

.PHONY: update-mapray-major-version
update-mapray-major-version:
	./scripts/update_package_json.sh -t mapray -v major

.PHONY: setup-for-mapray-production-deploy
setup-for-mapray-production-deploy:
	./scripts/setup_deploy.sh -t mapray -a production

.PHONY: release-ui-patch
release-ui-patch: update-ui-patch-version build-ui build-css setup-for-ui-production-deploy ;

.PHONY: release-ui-minor
release-ui-minor: update-ui-minor-version build-ui build-css setup-for-ui-production-deploy ;

.PHONY: release-ui-major
release-ui-major: update-ui-major-version build-ui build-css setup-for-ui-production-deploy ;

.PHONY: update-ui-patch-version
update-ui-patch-version:
	./scripts/update_package_json.sh -t ui -v patch

.PHONY: update-ui-minor-version
update-ui-minor-version:
	./scripts/update_package_json.sh -t ui -v minor

.PHONY: update-ui-major-version
update-ui-major-version:
	./scripts/update_package_json.sh -t ui -v major

.PHONY: setup-for-ui-production-deploy
setup-for-ui-production-deploy:
	./scripts/setup_deploy.sh -t ui -a production

.PHONY: build
build: build-mapray-js pack-mapray-js build-ui back-ui

.PHONY: build-mapray-js
build-mapray-js: # build mapray-js
	cd $(MAPRAY_JS_DIR); yarn build;

.PHONY: pack-mapray-js
pack-mapray-js: # pack mapray-js
	cd $(MAPRAY_JS_DIR); yarn pack;

.PHONY: build-ui
build-ui: # build ui package
	cd $(UI_DIR); yarn build;

.PHONY: pack-ui
pack-ui: # packing ui
	cd $(UI_DIR); yarn pack;

.PHONY: build-css
build-css: # build css
	cd $(UI_DIR); yarn css;