REPO = "fireplace"
UUID = "8af8c763-da9b-444d-a911-206f9e225b55"
VERSION = `date "+%Y.%m.%d_%H.%M.%S"`
VERSION_INT = $(shell date "+%Y%m%d%H%M%S")
TMP = _tmp

# This is what the iframe src points to.
DOMAIN?=marketplace.firefox.com

# This is what the app will be named on the device.
NAME?=Marketplace

SERVER?=prod

compile:
	commonplace compile

test: clean compile
	cd smokealarm ; \
	casperjs test tests

# Fireplace (real packaged app)
package: clean
	@rm -rf TMP
	@mkdir -p TMP
	@cp -r hearth TMP/hearth

	@mv TMP/hearth/media/js/settings_package_$(SERVER).js TMP/hearth/media/js/settings_local_package.js
	@rm -rf TMP/hearth/media/js/settings_package_*.js

	@pushd TMP && commonplace includes && popd
	@pushd TMP && commonplace langpacks && popd

	@# We have to have a temp file to work around a bug in Mac's version of sed :(
	@sed -i'.bak' -e 's/"Marketplace"/"$(NAME)"/g' TMP/hearth/manifest.webapp
	@sed -i'.bak' -e 's/marketplace\.firefox\.com/$(DOMAIN)/g' TMP/hearth/manifest.webapp
	@sed -i'.bak' -e 's/{fireplace_package_version}/$(VERSION_INT)/g' TMP/hearth/{manifest.webapp,media/js/include.js}

	@rm -rf package/archives/latest_$(SERVER)
	@mkdir -p package/archives/latest_$(SERVER)
	@rm -f package/archives/latest_$(SERVER).zip

	@pushd TMP/hearth && \
		cat ../../package/files.txt | zip -9 -r ../../package/archives/$(NAME)_$(SERVER)_$(VERSION_INT).zip -@ && \
		popd
	@echo "Created package: package/archives/$(NAME)_$(SERVER)_$(VERSION_INT).zip"
	@cp package/archives/$(NAME)_$(SERVER)_$(VERSION_INT).zip package/archives/latest_$(SERVER).zip
	@echo "Created package: package/archives/latest_$(SERVER).zip"

	@pushd package/archives/latest_$(SERVER) && \
		unzip ../latest_$(SERVER).zip && \
		popd
	@echo "Unzipped latest package: package/archives/latest_$(SERVER)/"

	@rm -rf TMP

package_prod:
	make package

package_stage:
	SERVER='stage' Name='Stage' DOMAIN='marketplace.allizom.org' make package

package_dev:
	SERVER='dev' NAME='Dev' DOMAIN='marketplace-dev.allizom.org' make package

serve_package:
	@open 'http://localhost:8676/app.html'
	@pushd package/archives/latest_$(SERVER) && \
		python -m SimpleHTTPServer 8676

serve_package_prod:
	make serve_package

serve_package_stage:
	SERVER='stage' make serve_package

serve_package_dev:
	SERVER='dev' make serve_package

# Yulelog (iframe'd packaged app)
log: clean
	@mkdir -p TMP && cp -pR yulelog/* TMP/.
	@# We have to have a temp file to work around a bug in Mac's version of sed :(
	@sed -i'.bak' -e 's/marketplace\.firefox\.com/$(DOMAIN)/g' TMP/{main.js,manifest.webapp}
	@sed -i'.bak' -e 's/{version}/$(VERSION_INT)/g' TMP/manifest.webapp
	@sed -i'.bak' -e 's/"Marketplace"/"$(NAME)"/g' TMP/manifest.webapp
	@rm -f TMP/README.md
	@rm -f TMP/*.bak
	@cd TMP && zip -q -r ../yulelog_$(NAME)_$(VERSION_INT).zip * && cd ../
	@rm -rf TMP
	@echo "Created file: yulelog_$(NAME)_$(VERSION_INT).zip"

submit:
	@open 'https://'$(DOMAIN)'/developers/app/marketplace/status#upload-new-version'

approve:
	@open 'https://'$(DOMAIN)'/reviewers/apps/review/marketplace#review-actions'

clean:
	commonplace clean

deploy:
	git fetch && git reset --hard origin/master && npm install && make includes

