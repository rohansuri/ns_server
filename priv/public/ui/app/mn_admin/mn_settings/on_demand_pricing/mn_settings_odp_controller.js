(function () {
  "use strict";

  angular.module('mnSettingsOnDemandPricing', [
    'mnSettingsODPService',
    'mnPromiseHelper',
    "mnSettingsClusterService"
  ]).controller('mnSettingsODPController', mnSettingsODPController);

  function mnSettingsODPController($scope, mnPromiseHelper, mnSettingsODPService, mnSettingsClusterService) {
    var vm = this;

    mnSettingsClusterService.registerSubmitCallback(submit);

    activate();

    function activate() {
      mnPromiseHelper(vm, mnSettingsODPService.getODPSettings())
        .applyToScope(function (odpSettings) {
          vm.odpSettings = odpSettings;
          vm.odpSettings.reporting_enabled && validate();
        });
    }

    function submit() {
      validate().then(function () {
        return mnPromiseHelper(vm, mnSettingsODPService.saveODPSettings(vm.odpSettings))
          .catchErrors()
          .getPromise();
      });
    }

    function validate() {
      if (!vm.odpSettings) {
        return;
      }

      return mnPromiseHelper(vm, mnSettingsODPService.validateODPSettings(vm.odpSettings))
        .catchErrors()
        .applyToScope("valid")
        .getPromise();
    }
  }
})();