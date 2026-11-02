// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { mojo } from "//resources/mojo/mojo/public/js/bindings.js";
import { ActionSpec as selection_mojom_ActionSpec } from "./action.mojom-webui.js";
import { GenericPendingAssociatedReceiverSpec as mojoBase_mojom_GenericPendingAssociatedReceiverSpec } from "//resources/mojo/mojo/public/mojom/base/generic_pending_associated_receiver.mojom-webui.js";
import { UnguessableTokenSpec as mojoBase_mojom_UnguessableTokenSpec } from "//resources/mojo/mojo/public/mojom/base/unguessable_token.mojom-webui.js";
import { BitmapMappedFromTrustedProcessSpec as skia_mojom_BitmapMappedFromTrustedProcessSpec } from "//resources/mojo/skia/public/mojom/bitmap.mojom-webui.js";
import {
  PointFSpec as gfx_mojom_PointFSpec,
  RectFSpec as gfx_mojom_RectFSpec,
} from "//resources/mojo/ui/gfx/geometry/mojom/geometry.mojom-webui.js";
export const DismissOverlayReasonSpec = { $: mojo.internal.Enum() };
export var DismissOverlayReason;
(function (DismissOverlayReason) {
  DismissOverlayReason[(DismissOverlayReason["MIN_VALUE"] = 0)] = "MIN_VALUE";
  DismissOverlayReason[(DismissOverlayReason["MAX_VALUE"] = 1)] = "MAX_VALUE";
  DismissOverlayReason[(DismissOverlayReason["kCloseButton"] = 0)] =
    "kCloseButton";
  DismissOverlayReason[(DismissOverlayReason["kBackgroundClick"] = 1)] =
    "kBackgroundClick";
})(DismissOverlayReason || (DismissOverlayReason = {}));
export class SuggestedActionsListenerPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.selection.SuggestedActionsListener",
      scope,
    );
  }
}
export class SuggestedActionsListenerRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      SuggestedActionsListenerPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  onSuggestedActionsAvailable(actions) {
    this.proxy.sendMessage(
      1977576422,
      SuggestedActionsListener_OnSuggestedActionsAvailable_ParamsSpec.$,
      null,
      [actions],
      false,
    );
  }
}
export class SuggestedActionsListenerReceiver {
  helper_internal_;
  $;
  onConnectionError;
  constructor(impl) {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        SuggestedActionsListenerRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.helper_internal_.registerHandler(
      1977576422,
      SuggestedActionsListener_OnSuggestedActionsAvailable_ParamsSpec.$,
      null,
      impl.onSuggestedActionsAvailable.bind(impl),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
}
export class SuggestedActionsListener {
  static get $interfaceName() {
    return "glic.selection.SuggestedActionsListener";
  }
  static getRemote() {
    let remote = new SuggestedActionsListenerRemote();
    remote.$.bindNewPipeAndPassReceiver().bindInBrowser();
    return remote;
  }
}
export class SuggestedActionsListenerCallbackRouter {
  helper_internal_;
  $;
  router_;
  onSuggestedActionsAvailable;
  onConnectionError;
  constructor() {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        SuggestedActionsListenerRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.router_ = new mojo.internal.interfaceSupport.CallbackRouter();
    this.onSuggestedActionsAvailable =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1977576422,
      SuggestedActionsListener_OnSuggestedActionsAvailable_ParamsSpec.$,
      null,
      this.onSuggestedActionsAvailable.createReceiverHandler(false),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
  removeListener(id) {
    return this.router_.removeListener(id);
  }
}
export class SelectionOverlayPageHandlerFactoryPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.selection.SelectionOverlayPageHandlerFactory",
      scope,
    );
  }
}
export class SelectionOverlayPageHandlerFactoryRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      SelectionOverlayPageHandlerFactoryPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  createPageHandler(handler, page) {
    this.proxy.sendMessage(
      404908115,
      SelectionOverlayPageHandlerFactory_CreatePageHandler_ParamsSpec.$,
      null,
      [handler, page],
      false,
    );
  }
}
export class SelectionOverlayPageHandlerFactoryReceiver {
  helper_internal_;
  $;
  onConnectionError;
  constructor(impl) {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        SelectionOverlayPageHandlerFactoryRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.helper_internal_.registerHandler(
      404908115,
      SelectionOverlayPageHandlerFactory_CreatePageHandler_ParamsSpec.$,
      null,
      impl.createPageHandler.bind(impl),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
}
export class SelectionOverlayPageHandlerFactory {
  static get $interfaceName() {
    return "glic.selection.SelectionOverlayPageHandlerFactory";
  }
  static getRemote() {
    let remote = new SelectionOverlayPageHandlerFactoryRemote();
    remote.$.bindNewPipeAndPassReceiver().bindInBrowser();
    return remote;
  }
}
export class SelectionOverlayPageHandlerFactoryCallbackRouter {
  helper_internal_;
  $;
  router_;
  createPageHandler;
  onConnectionError;
  constructor() {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        SelectionOverlayPageHandlerFactoryRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.router_ = new mojo.internal.interfaceSupport.CallbackRouter();
    this.createPageHandler =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      404908115,
      SelectionOverlayPageHandlerFactory_CreatePageHandler_ParamsSpec.$,
      null,
      this.createPageHandler.createReceiverHandler(false),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
  removeListener(id) {
    return this.router_.removeListener(id);
  }
}
export class SelectionOverlayPageHandlerPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.selection.SelectionOverlayPageHandler",
      scope,
    );
  }
}
export class SelectionOverlayPageHandlerRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      SelectionOverlayPageHandlerPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  dismissOverlay(dismissReason) {
    this.proxy.sendMessage(
      1779862079,
      SelectionOverlayPageHandler_DismissOverlay_ParamsSpec.$,
      null,
      [dismissReason],
      false,
    );
  }
  adjustRegion(target, isUsingKeyboard) {
    this.proxy.sendMessage(
      1001175755,
      SelectionOverlayPageHandler_AdjustRegion_ParamsSpec.$,
      null,
      [target, isUsingKeyboard],
      false,
    );
  }
  deleteRegion(id, isUsingKeyboard) {
    this.proxy.sendMessage(
      1360012626,
      SelectionOverlayPageHandler_DeleteRegion_ParamsSpec.$,
      null,
      [id, isUsingKeyboard],
      false,
    );
  }
  closePreselectionBubble() {
    this.proxy.sendMessage(
      1367120151,
      SelectionOverlayPageHandler_ClosePreselectionBubble_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  addBackgroundBlur() {
    this.proxy.sendMessage(
      419025281,
      SelectionOverlayPageHandler_AddBackgroundBlur_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  setLiveBlur(enabled) {
    this.proxy.sendMessage(
      552552862,
      SelectionOverlayPageHandler_SetLiveBlur_ParamsSpec.$,
      null,
      [enabled],
      false,
    );
  }
  submitPrompt(prompt) {
    this.proxy.sendMessage(
      1491556089,
      SelectionOverlayPageHandler_SubmitPrompt_ParamsSpec.$,
      null,
      [prompt],
      false,
    );
  }
  getSuggestedActions(listener) {
    this.proxy.sendMessage(
      51022263,
      SelectionOverlayPageHandler_GetSuggestedActions_ParamsSpec.$,
      null,
      [listener],
      false,
    );
  }
  executeSuggestedAction(actionId, channel) {
    this.proxy.sendMessage(
      938762758,
      SelectionOverlayPageHandler_ExecuteSuggestedAction_ParamsSpec.$,
      null,
      [actionId, channel],
      false,
    );
  }
}
export class SelectionOverlayPageHandlerReceiver {
  helper_internal_;
  $;
  onConnectionError;
  constructor(impl) {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        SelectionOverlayPageHandlerRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.helper_internal_.registerHandler(
      1779862079,
      SelectionOverlayPageHandler_DismissOverlay_ParamsSpec.$,
      null,
      impl.dismissOverlay.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      1001175755,
      SelectionOverlayPageHandler_AdjustRegion_ParamsSpec.$,
      null,
      impl.adjustRegion.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      1360012626,
      SelectionOverlayPageHandler_DeleteRegion_ParamsSpec.$,
      null,
      impl.deleteRegion.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      1367120151,
      SelectionOverlayPageHandler_ClosePreselectionBubble_ParamsSpec.$,
      null,
      impl.closePreselectionBubble.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      419025281,
      SelectionOverlayPageHandler_AddBackgroundBlur_ParamsSpec.$,
      null,
      impl.addBackgroundBlur.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      552552862,
      SelectionOverlayPageHandler_SetLiveBlur_ParamsSpec.$,
      null,
      impl.setLiveBlur.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      1491556089,
      SelectionOverlayPageHandler_SubmitPrompt_ParamsSpec.$,
      null,
      impl.submitPrompt.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      51022263,
      SelectionOverlayPageHandler_GetSuggestedActions_ParamsSpec.$,
      null,
      impl.getSuggestedActions.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      938762758,
      SelectionOverlayPageHandler_ExecuteSuggestedAction_ParamsSpec.$,
      null,
      impl.executeSuggestedAction.bind(impl),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
}
export class SelectionOverlayPageHandler {
  static get $interfaceName() {
    return "glic.selection.SelectionOverlayPageHandler";
  }
  static getRemote() {
    let remote = new SelectionOverlayPageHandlerRemote();
    remote.$.bindNewPipeAndPassReceiver().bindInBrowser();
    return remote;
  }
}
export class SelectionOverlayPageHandlerCallbackRouter {
  helper_internal_;
  $;
  router_;
  dismissOverlay;
  adjustRegion;
  deleteRegion;
  closePreselectionBubble;
  addBackgroundBlur;
  setLiveBlur;
  submitPrompt;
  getSuggestedActions;
  executeSuggestedAction;
  onConnectionError;
  constructor() {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        SelectionOverlayPageHandlerRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.router_ = new mojo.internal.interfaceSupport.CallbackRouter();
    this.dismissOverlay =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1779862079,
      SelectionOverlayPageHandler_DismissOverlay_ParamsSpec.$,
      null,
      this.dismissOverlay.createReceiverHandler(false),
      false,
    );
    this.adjustRegion =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1001175755,
      SelectionOverlayPageHandler_AdjustRegion_ParamsSpec.$,
      null,
      this.adjustRegion.createReceiverHandler(false),
      false,
    );
    this.deleteRegion =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1360012626,
      SelectionOverlayPageHandler_DeleteRegion_ParamsSpec.$,
      null,
      this.deleteRegion.createReceiverHandler(false),
      false,
    );
    this.closePreselectionBubble =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1367120151,
      SelectionOverlayPageHandler_ClosePreselectionBubble_ParamsSpec.$,
      null,
      this.closePreselectionBubble.createReceiverHandler(false),
      false,
    );
    this.addBackgroundBlur =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      419025281,
      SelectionOverlayPageHandler_AddBackgroundBlur_ParamsSpec.$,
      null,
      this.addBackgroundBlur.createReceiverHandler(false),
      false,
    );
    this.setLiveBlur =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      552552862,
      SelectionOverlayPageHandler_SetLiveBlur_ParamsSpec.$,
      null,
      this.setLiveBlur.createReceiverHandler(false),
      false,
    );
    this.submitPrompt =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1491556089,
      SelectionOverlayPageHandler_SubmitPrompt_ParamsSpec.$,
      null,
      this.submitPrompt.createReceiverHandler(false),
      false,
    );
    this.getSuggestedActions =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      51022263,
      SelectionOverlayPageHandler_GetSuggestedActions_ParamsSpec.$,
      null,
      this.getSuggestedActions.createReceiverHandler(false),
      false,
    );
    this.executeSuggestedAction =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      938762758,
      SelectionOverlayPageHandler_ExecuteSuggestedAction_ParamsSpec.$,
      null,
      this.executeSuggestedAction.createReceiverHandler(false),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
  removeListener(id) {
    return this.router_.removeListener(id);
  }
}
export class SelectionOverlayPagePendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.selection.SelectionOverlayPage",
      scope,
    );
  }
}
export class SelectionOverlayPageRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      SelectionOverlayPagePendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  screenshotReceived(screenshot) {
    this.proxy.sendMessage(
      1756828688,
      SelectionOverlayPage_ScreenshotReceived_ParamsSpec.$,
      null,
      [screenshot],
      false,
    );
  }
  setPostRegionSelections(regions) {
    this.proxy.sendMessage(
      1719691706,
      SelectionOverlayPage_SetPostRegionSelections_ParamsSpec.$,
      null,
      [regions],
      false,
    );
  }
}
export class SelectionOverlayPageReceiver {
  helper_internal_;
  $;
  onConnectionError;
  constructor(impl) {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        SelectionOverlayPageRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.helper_internal_.registerHandler(
      1756828688,
      SelectionOverlayPage_ScreenshotReceived_ParamsSpec.$,
      null,
      impl.screenshotReceived.bind(impl),
      false,
    );
    this.helper_internal_.registerHandler(
      1719691706,
      SelectionOverlayPage_SetPostRegionSelections_ParamsSpec.$,
      null,
      impl.setPostRegionSelections.bind(impl),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
}
export class SelectionOverlayPage {
  static get $interfaceName() {
    return "glic.selection.SelectionOverlayPage";
  }
  static getRemote() {
    let remote = new SelectionOverlayPageRemote();
    remote.$.bindNewPipeAndPassReceiver().bindInBrowser();
    return remote;
  }
}
export class SelectionOverlayPageCallbackRouter {
  helper_internal_;
  $;
  router_;
  screenshotReceived;
  setPostRegionSelections;
  onConnectionError;
  constructor() {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        SelectionOverlayPageRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.router_ = new mojo.internal.interfaceSupport.CallbackRouter();
    this.screenshotReceived =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1756828688,
      SelectionOverlayPage_ScreenshotReceived_ParamsSpec.$,
      null,
      this.screenshotReceived.createReceiverHandler(false),
      false,
    );
    this.setPostRegionSelections =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1719691706,
      SelectionOverlayPage_SetPostRegionSelections_ParamsSpec.$,
      null,
      this.setPostRegionSelections.createReceiverHandler(false),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
  removeListener(id) {
    return this.router_.removeListener(id);
  }
}
export const SelectedRegionSpec = { $: {} };
export const SuggestedActionSpec = { $: {} };
export const SuggestedActionsListener_OnSuggestedActionsAvailable_ParamsSpec = {
  $: {},
};
export const SelectionOverlayPageHandlerFactory_CreatePageHandler_ParamsSpec = {
  $: {},
};
export const SelectionOverlayPageHandler_DismissOverlay_ParamsSpec = { $: {} };
export const SelectionOverlayPageHandler_AdjustRegion_ParamsSpec = { $: {} };
export const SelectionOverlayPageHandler_DeleteRegion_ParamsSpec = { $: {} };
export const SelectionOverlayPageHandler_ClosePreselectionBubble_ParamsSpec = {
  $: {},
};
export const SelectionOverlayPageHandler_AddBackgroundBlur_ParamsSpec = {
  $: {},
};
export const SelectionOverlayPageHandler_SetLiveBlur_ParamsSpec = { $: {} };
export const SelectionOverlayPageHandler_SubmitPrompt_ParamsSpec = { $: {} };
export const SelectionOverlayPageHandler_GetSuggestedActions_ParamsSpec = {
  $: {},
};
export const SelectionOverlayPageHandler_ExecuteSuggestedAction_ParamsSpec = {
  $: {},
};
export const SelectionOverlayPage_ScreenshotReceived_ParamsSpec = { $: {} };
export const SelectionOverlayPage_SetPostRegionSelections_ParamsSpec = {
  $: {},
};
export const RegionShapeSpec = { $: {} };
mojo.internal.Struct(
  SelectedRegionSpec.$,
  "SelectedRegion",
  [
    mojo.internal.StructField(
      "id",
      0,
      0,
      mojoBase_mojom_UnguessableTokenSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "shape",
      8,
      0,
      RegionShapeSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 32]],
);
mojo.internal.Struct(
  SuggestedActionSpec.$,
  "SuggestedAction",
  [
    mojo.internal.StructField(
      "id",
      0,
      0,
      mojoBase_mojom_UnguessableTokenSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "title",
      8,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "action",
      16,
      0,
      selection_mojom_ActionSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 40]],
);
mojo.internal.Struct(
  SuggestedActionsListener_OnSuggestedActionsAvailable_ParamsSpec.$,
  "SuggestedActionsListener_OnSuggestedActionsAvailable_Params",
  [
    mojo.internal.StructField(
      "actions",
      0,
      0,
      mojo.internal.Array(SuggestedActionSpec.$, false),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandlerFactory_CreatePageHandler_ParamsSpec.$,
  "SelectionOverlayPageHandlerFactory_CreatePageHandler_Params",
  [
    mojo.internal.StructField(
      "handler",
      0,
      0,
      mojo.internal.InterfaceRequest(
        SelectionOverlayPageHandlerPendingReceiver,
      ),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "page",
      4,
      0,
      mojo.internal.InterfaceProxy(SelectionOverlayPageRemote),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandler_DismissOverlay_ParamsSpec.$,
  "SelectionOverlayPageHandler_DismissOverlay_Params",
  [
    mojo.internal.StructField(
      "dismissReason",
      0,
      0,
      DismissOverlayReasonSpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandler_AdjustRegion_ParamsSpec.$,
  "SelectionOverlayPageHandler_AdjustRegion_Params",
  [
    mojo.internal.StructField(
      "target",
      0,
      0,
      SelectedRegionSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isUsingKeyboard",
      8,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandler_DeleteRegion_ParamsSpec.$,
  "SelectionOverlayPageHandler_DeleteRegion_Params",
  [
    mojo.internal.StructField(
      "id",
      0,
      0,
      mojoBase_mojom_UnguessableTokenSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isUsingKeyboard",
      8,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandler_ClosePreselectionBubble_ParamsSpec.$,
  "SelectionOverlayPageHandler_ClosePreselectionBubble_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandler_AddBackgroundBlur_ParamsSpec.$,
  "SelectionOverlayPageHandler_AddBackgroundBlur_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandler_SetLiveBlur_ParamsSpec.$,
  "SelectionOverlayPageHandler_SetLiveBlur_Params",
  [
    mojo.internal.StructField(
      "enabled",
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
  SelectionOverlayPageHandler_SubmitPrompt_ParamsSpec.$,
  "SelectionOverlayPageHandler_SubmitPrompt_Params",
  [
    mojo.internal.StructField(
      "prompt",
      0,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandler_GetSuggestedActions_ParamsSpec.$,
  "SelectionOverlayPageHandler_GetSuggestedActions_Params",
  [
    mojo.internal.StructField(
      "listener",
      0,
      0,
      mojo.internal.InterfaceProxy(SuggestedActionsListenerRemote),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  SelectionOverlayPageHandler_ExecuteSuggestedAction_ParamsSpec.$,
  "SelectionOverlayPageHandler_ExecuteSuggestedAction_Params",
  [
    mojo.internal.StructField(
      "actionId",
      0,
      0,
      mojoBase_mojom_UnguessableTokenSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "channel",
      8,
      0,
      mojoBase_mojom_GenericPendingAssociatedReceiverSpec.$,
      null,
      true,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  SelectionOverlayPage_ScreenshotReceived_ParamsSpec.$,
  "SelectionOverlayPage_ScreenshotReceived_Params",
  [
    mojo.internal.StructField(
      "screenshot",
      0,
      0,
      skia_mojom_BitmapMappedFromTrustedProcessSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  SelectionOverlayPage_SetPostRegionSelections_ParamsSpec.$,
  "SelectionOverlayPage_SetPostRegionSelections_Params",
  [
    mojo.internal.StructField(
      "regions",
      0,
      0,
      mojo.internal.Array(SelectedRegionSpec.$, false),
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Union(RegionShapeSpec.$, "RegionShape", {
  rect: { ordinal: 0, type: gfx_mojom_RectFSpec.$ },
  polyline: {
    ordinal: 1,
    type: mojo.internal.Array(gfx_mojom_PointFSpec.$, false),
  },
});
export var RegionShapeFieldTags;
(function (RegionShapeFieldTags) {
  RegionShapeFieldTags[(RegionShapeFieldTags["RECT"] = 0)] = "RECT";
  RegionShapeFieldTags[(RegionShapeFieldTags["POLYLINE"] = 1)] = "POLYLINE";
})(RegionShapeFieldTags || (RegionShapeFieldTags = {}));
export function whichRegionShape(u) {
  if (u.rect !== null && u.rect !== undefined) {
    return RegionShapeFieldTags.RECT;
  }
  if (u.polyline !== null && u.polyline !== undefined) {
    return RegionShapeFieldTags.POLYLINE;
  }
  throw new Error("no union field has been set, this is an illegal state");
}
