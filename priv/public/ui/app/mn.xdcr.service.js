import { Injectable } from "/ui/web_modules/@angular/core.js";
import { HttpClient } from '/ui/web_modules/@angular/common/http.js';
import { BehaviorSubject, combineLatest, timer } from "/ui/web_modules/rxjs.js";
import { map, shareReplay, switchMap } from '/ui/web_modules/rxjs/operators.js';
import { pipe, filter, propEq, sortBy, prop, groupBy } from "/ui/web_modules/ramda.js";

import { MnHttpRequest } from './mn.http.request.js';

export { MnXDCRService };

class MnXDCRService {
  static get annotations() { return [
    new Injectable()
  ]}

  static get parameters() { return [
    HttpClient
  ]}

  constructor(http) {
    this.http = http;

    this.stream = {};

    this.stream.updateRemoteClusters =
      new BehaviorSubject();

    this.stream.deleteRemoteClusters =
      new MnHttpRequest(this.deleteRemoteClusters.bind(this))
      .addSuccess()
      .addError();

    this.stream.deleteCancelXDCR =
      new MnHttpRequest(this.deleteCancelXDCR.bind(this))
      .addSuccess()
      .addError();

    this.stream.getSettingsReplications = this.createGetSettingsReplicationsPipe();

    this.stream.postSettingsReplications =
      new MnHttpRequest(this.postSettingsReplications(false).bind(this))
      .addSuccess()
      .addError();

    this.stream.postPausePlayReplication =
      new MnHttpRequest(this.postSettingsReplications(false).bind(this))
      .addSuccess()
      .addError();

    this.stream.postSettingsReplicationsValidation =
      new MnHttpRequest(this.postSettingsReplications(true).bind(this))
      .addSuccess()
      .addError();

    this.stream.postCreateReplication =
      new MnHttpRequest(this.postCreateReplication.bind(this))
      .addSuccess(map(data => JSON.parse(data)))
      .addError(map(error => (error && error.errors) || ({_: (error && error.error) || error})));

    this.stream.postRemoteClusters =
      new MnHttpRequest(this.postRemoteClusters.bind(this))
      .addSuccess()
      .addError();

    this.stream.postRegexpValidation =
      new MnHttpRequest(this.postRegexpValidation.bind(this))
      .addSuccess(map(data => JSON.parse(data)))
      .addError(map(error => ({error: error.error || error})));

    this.stream.getRemoteClusters =
      combineLatest(timer(0, 10000),
                    this.stream.updateRemoteClusters)
      .pipe(switchMap(this.getRemoteClusters.bind(this)),
            shareReplay({refCount: true, bufferSize: 1}));

    this.stream.getRemoteClustersFiltered = this.stream.getRemoteClusters
      .pipe(map(pipe(filter(propEq('deleted', false)),
                     sortBy(prop('name')))),
            shareReplay({refCount: true, bufferSize: 1}));

    this.stream.getRemoteClustersByUUID = this.stream.getRemoteClusters
      .pipe(map(groupBy(prop("uuid"))),
            shareReplay({refCount: true, bufferSize: 1}));
  }

  prepareReplicationSettigns([_, isEnterprise, compatVersion55]) {
    //this points to the component view instance
    var settings = Object.assign({}, this.form.group.value);
    if (isEnterprise) {
      settings.filterSkipRestream = (settings.filterSkipRestream === "true");
    } else {
      delete settings.filterExpression;
      delete settings.filterSkipRestream;
    }

    if (!this.isEditMode) {
      delete settings.filterSkipRestream;
    }
    if (!isEnterprise || !compatVersion55 || settings.type == "capi") {
      delete settings.compressionType;
    }
    if (!isEnterprise || settings.type !== "xmem") {
      delete settings.networkUsageLimit;
    }
    settings.replicationType = "continuous";

    return settings;
  }

  createGetSettingsReplicationsPipe(id) {
    return (new BehaviorSubject(id)).pipe(
      switchMap(this.getSettingsReplications.bind(this)),
      shareReplay({refCount: true, bufferSize: 1}));
  }

  postRegexpValidation(params) {
    return this.http.post("/_goxdcr/regexpValidation", params);
  }

  deleteRemoteClusters(name) {
    return this.http.delete('/pools/default/remoteClusters/' + encodeURIComponent(name));
  }

  deleteCancelXDCR(id) {
    return this.http.delete('/controller/cancelXDCR/' + encodeURIComponent(id));
  }

  getSettingsReplications(id) {
    return this.http.get("/settings/replications" +
                         (id ? ("/" + encodeURIComponent(id)) : ""));
  }

  postSettingsReplications(validate) {
    return source =>
      this.http.post("/settings/replications" +
                     (source[0] ? ("/" + encodeURIComponent(source[0])) : ""),
                     source[0] ? source[1] : source,
                     {params: {"just_validate": validate ? 1 : 0}});
  }

  postCreateReplication(data) {
    return this.http.post("/controller/createReplication", data);
  }

  getRemoteClusters() {
    return this.http.get("/pools/default/remoteClusters");
  }

  postRemoteClusters(source) {
    var cluster = source[0];
    var name = source[1];
    var re;
    var result;
    if (cluster.hostname) {
      re = /^\[?([^\]]+)\]?:(\d+)$/; // ipv4/ipv6/hostname + port
      result = re.exec(cluster.hostname);
      if (!result) {
        cluster.hostname += ":8091";
      }
    }
    if (!cluster.demandEncryption) {
      delete cluster.certificate;
      delete cluster.demandEncryption;
      delete cluster.encryptionType;
      delete cluster.clientCertificate;
      delete cluster.clientKey;
    }
    delete cluster.secureType;
    return this.http.post('/pools/default/remoteClusters' +
                          (name ? ("/" + encodeURIComponent(name)) : ""), cluster);
  }
}