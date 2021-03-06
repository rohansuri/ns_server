export default mnStatisticsDetailedChartController;

function mnStatisticsDetailedChartController($scope, $timeout, $state, chart, items, mnStatisticsNewService) {
  var vm = this;
  vm.chart = Object.assign({}, chart, {size: "extra"});

  vm.items = items;
  vm.onSelectZoom = onSelectZoom;
  vm.bucket = $state.params.scenarioBucket;
  vm.zoom = $state.params.scenarioZoom !== "minute" ? $state.params.scenarioZoom : "hour";
  vm.node = $state.params.statsHostname;
  vm.options = {showFocus: true, showTicks: true, showLegends: true};

  mnStatisticsNewService.mnAdminStatsPoller.heartbeat.setInterval(
    mnStatisticsNewService.defaultZoomInterval(vm.zoom));

  function onSelectZoom() {
    vm.options.showFocus = vm.zoom !== "minute";
    mnStatisticsNewService.mnAdminStatsPoller.heartbeat.setInterval(
      mnStatisticsNewService.defaultZoomInterval(vm.zoom));
    vm.reloadChartDirective = true;
    $timeout(function () {
      vm.reloadChartDirective = false;
    });
  }

  $scope.$on("$destroy", function () {
    mnStatisticsNewService.mnAdminStatsPoller.heartbeat.setInterval(
      mnStatisticsNewService.defaultZoomInterval($state.params.scenarioZoom));
    mnStatisticsNewService.mnAdminStatsPoller.heartbeat.reload();
  });

}
