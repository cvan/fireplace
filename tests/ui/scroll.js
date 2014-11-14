var helpers = require('../helpers');

var firstItemSel = '#gallery .listing li:first-child a';
var originalFirefoxAndroid;
var scrollPos;

helpers.startCasper({path: '/category/games'});

function getScrollY() {
    return casper.evaluate(function() {
        return window.scrollY;
    });
}

function scrollToElementAndGetScrollY(selector) {
    return casper.evaluate(function(selector) {
        document.querySelector(selector).scrollIntoView();
        return window.scrollY;
    }, selector);
}

function mockFirefoxAndroid(enabled, original) {
    casper.echo((original ? 'Restoring' : 'Settings') +
        ' capabilities.firefoxAndroid -> ' + enabled, 'INFO');
    return casper.evaluate(function(enabled) {
        return require('capabilities').firefoxAndroid = enabled;
    }, enabled);
}

casper.test.begin('General Scroll tests', {
    setUp: function() {
        casper.once('page.initialized', function() {
            originalFirefoxAndroid = casper.evaluate(function() {
                return require('capabilities').firefoxAndroid;
            });
            casper.echo('Remembering capabilities.firefoxAndroid <- ' +
                originalFirefoxAndroid, 'INFO');
        });
    },

    tearDown: function() {
        mockFirefoxAndroid(originalFirefoxAndroid, true);
    },

    test: function(test) {
        casper.waitForSelector('#gallery .listing', function() {
            var startScrollY = getScrollY();
            test.assertEquals(startScrollY, 0, 'ScrollY starts at 0');

            scrollPos = scrollToElementAndGetScrollY(firstItemSel);
            casper.click(firstItemSel);

            mockFirefoxAndroid(true);

            casper.wait(300, function() {
                var scrollY = getScrollY();
                test.assertEquals(scrollY, 0, 'Check scroll is 0');
                casper.back();
            });

            casper.wait(300, function() {
                var scrollY = getScrollY();
                test.assert(scrollY > 0, 'Check scroll is greater than 0');
                test.assertEquals(scrollY, scrollPos, "Check scroll hasn't changed");
                casper.click(firstItemSel);
            });

            casper.waitForSelector('#nav-back', function() {
                casper.click('#nav-back');
            });

            casper.wait(300, function() {
                var scrollY = getScrollY();
                test.assert(scrollY > 0, 'Check scroll is greater than 0');
                test.assertEquals(scrollY, scrollPos, "Check scroll hasn't changed");

                casper.click('.site a');  // Navigate to homepage.
            });

            // Wait for homepage to load.
            casper.waitForSelector('.navbar', function() {
                var startScrollY = getScrollY();
                test.assertEquals(startScrollY, 0, 'ScrollY starts at 0');

                scrollPos = scrollToElementAndGetScrollY('.navbar');
                casper.click('.navbar a');

                mockFirefoxAndroid(false);

                var scrollY = getScrollY();
                console.log('scrollY', scrollY);
                test.assertEquals(scrollY, 0, 'Check scroll is 0');
                casper.back();

                scrollY = getScrollY();
                test.assertEquals(scrollY, 0, 'Check scroll is 0');
            });
        });

        casper.run(function() {
            test.done();
        });
    }
});
