// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { mojo } from "//resources/mojo/mojo/public/js/bindings.js";
import { UrlSpec as url_mojom_UrlSpec } from "//resources/mojo/url/mojom/url.mojom-webui.js";
export class ExperimentalOptInPageHandlerPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.mojom.ExperimentalOptInPageHandler",
      scope,
    );
  }
}
export class ExperimentalOptInPageHandlerRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      ExperimentalOptInPageHandlerPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  accept() {
    this.proxy.sendMessage(
      1929016661,
      ExperimentalOptInPageHandler_Accept_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  reject() {
    this.proxy.sendMessage(
      2127748598,
      ExperimentalOptInPageHandler_Reject_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  onWebviewLoaded() {
    this.proxy.sendMessage(
      404540868,
      ExperimentalOptInPageHandler_OnWebviewLoaded_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  syncCookies() {
    return this.proxy.sendMessage(
      2001490314,
      ExperimentalOptInPageHandler_SyncCookies_ParamsSpec.$,
      ExperimentalOptInPageHandler_SyncCookies_ResponseParamsSpec.$,
      [],
      false,
    );
  }
  validateAndOpenLinkInNewTab(url) {
    this.proxy.sendMessage(
      1037139480,
      ExperimentalOptInPageHandler_ValidateAndOpenLinkInNewTab_ParamsSpec.$,
      null,
      [url],
      false,
    );
  }
}
export class ExperimentalOptInPageHandlerReceiver {
  helper_internal_;
  $;
  onConnectionError;
  constructor(impl) {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        ExperimentalOptInPageHandlerRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.helper_internal_.registerHandler(
      1929016661,
      ExperimentalOptInPageHandler_Accept_ParamsSpec.$,
      null,
      impl.accept.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      2127748598,
      ExperimentalOptInPageHandler_Reject_ParamsSpec.$,
      null,
      impl.reject.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      404540868,
      ExperimentalOptInPageHandler_OnWebviewLoaded_ParamsSpec.$,
      null,
      impl.onWebviewLoaded.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      2001490314,
      ExperimentalOptInPageHandler_SyncCookies_ParamsSpec.$,
      ExperimentalOptInPageHandler_SyncCookies_ResponseParamsSpec.$,
      impl.syncCookies.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      1037139480,
      ExperimentalOptInPageHandler_ValidateAndOpenLinkInNewTab_ParamsSpec.$,
      null,
      impl.validateAndOpenLinkInNewTab.bind(impl),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
}
export class ExperimentalOptInPageHandler {
  static get $interfaceName() {
    return "glic.mojom.ExperimentalOptInPageHandler";
  }
  static getRemote() {
    let remote = new ExperimentalOptInPageHandlerRemote();
    remote.$.bindNewPipeAndPassReceiver().bindInBrowser();
    return remote;
  }
}
export class ExperimentalOptInPageHandlerCallbackRouter {
  helper_internal_;
  $;
  router_;
  accept;
  reject;
  onWebviewLoaded;
  syncCookies;
  validateAndOpenLinkInNewTab;
  onConnectionError;
  constructor() {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        ExperimentalOptInPageHandlerRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.router_ = new mojo.internal.interfaceSupport.CallbackRouter();
    this.accept = new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
      this.router_,
    );
    this.helper_internal_.registerHandler(
      1929016661,
      ExperimentalOptInPageHandler_Accept_ParamsSpec.$,
      null,
      this.accept.createReceiverHandler(false),
      false,
    );
    this.reject = new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
      this.router_,
    );
    this.helper_internal_.registerHandler(
      2127748598,
      ExperimentalOptInPageHandler_Reject_ParamsSpec.$,
      null,
      this.reject.createReceiverHandler(false),
      false,
    );
    this.onWebviewLoaded =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      404540868,
      ExperimentalOptInPageHandler_OnWebviewLoaded_ParamsSpec.$,
      null,
      this.onWebviewLoaded.createReceiverHandler(false),
      false,
    );
    this.syncCookies =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      2001490314,
      ExperimentalOptInPageHandler_SyncCookies_ParamsSpec.$,
      ExperimentalOptInPageHandler_SyncCookies_ResponseParamsSpec.$,
      this.syncCookies.createReceiverHandler(true),
      false,
    );
    this.validateAndOpenLinkInNewTab =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1037139480,
      ExperimentalOptInPageHandler_ValidateAndOpenLinkInNewTab_ParamsSpec.$,
      null,
      this.validateAndOpenLinkInNewTab.createReceiverHandler(false),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
  removeListener(id) {
    return this.router_.removeListener(id);
  }
}
export const ExperimentalOptInPageHandler_Accept_ParamsSpec = { $: {} };
export const ExperimentalOptInPageHandler_Reject_ParamsSpec = { $: {} };
export const ExperimentalOptInPageHandler_OnWebviewLoaded_ParamsSpec = {
  $: {},
};
export const ExperimentalOptInPageHandler_SyncCookies_ParamsSpec = { $: {} };
export const ExperimentalOptInPageHandler_SyncCookies_ResponseParamsSpec = {
  $: {},
};
export const ExperimentalOptInPageHandler_ValidateAndOpenLinkInNewTab_ParamsSpec =
  { $: {} };
mojo.internal.Struct(
  ExperimentalOptInPageHandler_Accept_ParamsSpec.$,
  "ExperimentalOptInPageHandler_Accept_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  ExperimentalOptInPageHandler_Reject_ParamsSpec.$,
  "ExperimentalOptInPageHandler_Reject_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  ExperimentalOptInPageHandler_OnWebviewLoaded_ParamsSpec.$,
  "ExperimentalOptInPageHandler_OnWebviewLoaded_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  ExperimentalOptInPageHandler_SyncCookies_ParamsSpec.$,
  "ExperimentalOptInPageHandler_SyncCookies_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  ExperimentalOptInPageHandler_SyncCookies_ResponseParamsSpec.$,
  "ExperimentalOptInPageHandler_SyncCookies_ResponseParams",
  [
    mojo.internal.StructField(
      "success",
      0,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  ExperimentalOptInPageHandler_ValidateAndOpenLinkInNewTab_ParamsSpec.$,
  "ExperimentalOptInPageHandler_ValidateAndOpenLinkInNewTab_Params",
  [
    mojo.internal.StructField(
      "url",
      0,
      0,
      url_mojom_UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
