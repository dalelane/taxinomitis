(function () {

    angular
        .module('app')
        .service('utilService', utilService);

    utilService.$inject = [
        '$q'
    ];

    function utilService($q) {

        function loadScript(url) {
            return $q(function (resolve, reject) {
                var id = 'mlforkids-script-' + url;
                if (document.getElementById(id)) {
                    resolve();
                }
                else {
                    var scriptObj = document.createElement('script');
                    scriptObj.id = id;
                    scriptObj.type = 'text/javascript';
                    scriptObj.src = url;

                    scriptObj.onreadystatechange = resolve;
                    scriptObj.onload = resolve;
                    scriptObj.onerror = reject;

                    document.head.appendChild(scriptObj);
                }
            });
        }

        function loadImageProjectSupport() {
            return loadScript('/static/bower_components/blueimp-canvas-to-blob/js/canvas-to-blob.min.js');
        }

        function isInternetExplorer() {
            var userAgent = navigator.userAgent;
            return userAgent &&
                   (userAgent.indexOf('MSIE') >= 0 || userAgent.indexOf('Trident') >= 0);
        }

        function loadTensorFlow() {
            return loadScript('/static/bower_components/tensorflowjs/tf.min.js');
        }


        return {
            loadScript : loadScript,
            loadTensorFlow : loadTensorFlow,
            loadImageProjectSupport : loadImageProjectSupport,
            isInternetExplorer : isInternetExplorer
        };
    }

})();
