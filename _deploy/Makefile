MAPRAY_JS_DIR = ".."

.PHONY: release-patch
release-patch: update-patch-version build-mapray-js setup-for-production-deploy ;

.PHONY: release-minor
release-minor: update-minor-version build-mapray-js setup-for-production-deploy ;

.PHONY: release-major
release-major: update-major-version build-mapray-js setup-for-production-deploy ;

.PHONY: update-patch-version
update-patch-version:
	./scripts/update_package_json.sh patch

.PHONY: update-minor-version
update-minor-version:
	./scripts/update_package_json.sh minor

.PHONY: update-major-version
update-major-version:
	./scripts/update_package_json.sh major

.PHONY: setup-for-production-deploy
setup-for-production-deploy:
	./scripts/setup_deploy.sh production

.PHONY: build
build: build-mapray-js pack-mapray-js

.PHONY: build-mapray-js
build-mapray-js: # build mapray-js
	cd $(MAPRAY_JS_DIR); npm run release;

.PHONY: pack-mapray-js
pack-mapray-js: # pack mapray-js
	cd $(MAPRAY_JS_DIR); npm pack;
