VERSION = ` date "+%Y.%m%d" `


compile:
	node damper.js --compile

test: compile
	echo "lol"

package: compile
	cd hearth/ && zip -r $(VERSION).zip * && cd ../
