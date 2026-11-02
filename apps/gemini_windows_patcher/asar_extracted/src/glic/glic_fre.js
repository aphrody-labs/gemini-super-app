// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import "../../../../../../../../../../../../../../../strings.m.js";
import {
  a as assert,
  E as EventTracker,
  g as getRequiredElement,
  b as assertNotReachedCase$1,
  C as ColorChangeUpdater,
} from "./shared.rollup.js";
import { loadTimeData } from "chrome://resources/js/load_time_data.js";
import { mojo } from "chrome://resources/mojo/mojo/public/js/bindings.js";
import {
  css,
  html,
  CrLitElement,
} from "chrome://resources/lit/v3_0/lit.rollup.js";
({ $: mojo.internal.Enum() });
var FeatureMode;
(function (FeatureMode) {
  FeatureMode[(FeatureMode["MIN_VALUE"] = 0)] = "MIN_VALUE";
  FeatureMode[(FeatureMode["MAX_VALUE"] = 7)] = "MAX_VALUE";
  FeatureMode[(FeatureMode["kUnspecified"] = 0)] = "kUnspecified";
  FeatureMode[(FeatureMode["kImageGeneration"] = 1)] = "kImageGeneration";
  FeatureMode[(FeatureMode["kActuation"] = 2)] = "kActuation";
  FeatureMode[(FeatureMode["kExperimentalTriggering"] = 3)] =
    "kExperimentalTriggering";
  FeatureMode[(FeatureMode["kUniversalCart"] = 4)] = "kUniversalCart";
  FeatureMode[(FeatureMode["kPromotionPage"] = 5)] = "kPromotionPage";
  FeatureMode[(FeatureMode["kPasswordChange"] = 6)] = "kPasswordChange";
  FeatureMode[(FeatureMode["kWebContinuity"] = 7)] = "kWebContinuity";
})(FeatureMode || (FeatureMode = {}));
const PanelStateKindSpec = { $: mojo.internal.Enum() };
var PanelStateKind;
(function (PanelStateKind) {
  PanelStateKind[(PanelStateKind["MIN_VALUE"] = 0)] = "MIN_VALUE";
  PanelStateKind[(PanelStateKind["MAX_VALUE"] = 2)] = "MAX_VALUE";
  PanelStateKind[(PanelStateKind["kHidden"] = 0)] = "kHidden";
  PanelStateKind[(PanelStateKind["kDetached"] = 1)] = "kDetached";
  PanelStateKind[(PanelStateKind["kAttached"] = 2)] = "kAttached";
})(PanelStateKind || (PanelStateKind = {}));
({ $: mojo.internal.Enum() });
var Platform;
(function (Platform) {
  Platform[(Platform["MIN_VALUE"] = 0)] = "MIN_VALUE";
  Platform[(Platform["MAX_VALUE"] = 5)] = "MAX_VALUE";
  Platform[(Platform["kUnknown"] = 0)] = "kUnknown";
  Platform[(Platform["kMacOS"] = 1)] = "kMacOS";
  Platform[(Platform["kWindows"] = 2)] = "kWindows";
  Platform[(Platform["kLinux"] = 3)] = "kLinux";
  Platform[(Platform["kChromeOS"] = 4)] = "kChromeOS";
  Platform[(Platform["kAndroid"] = 5)] = "kAndroid";
})(Platform || (Platform = {}));
({ $: mojo.internal.Enum() });
var FormFactor;
(function (FormFactor) {
  FormFactor[(FormFactor["MIN_VALUE"] = 0)] = "MIN_VALUE";
  FormFactor[(FormFactor["MAX_VALUE"] = 3)] = "MAX_VALUE";
  FormFactor[(FormFactor["kUnknown"] = 0)] = "kUnknown";
  FormFactor[(FormFactor["kDesktop"] = 1)] = "kDesktop";
  FormFactor[(FormFactor["kPhone"] = 2)] = "kPhone";
  FormFactor[(FormFactor["kTablet"] = 3)] = "kTablet";
})(FormFactor || (FormFactor = {}));
({ $: mojo.internal.Enum() });
var FreOverride;
(function (FreOverride) {
  FreOverride[(FreOverride["MIN_VALUE"] = 0)] = "MIN_VALUE";
  FreOverride[(FreOverride["MAX_VALUE"] = 3)] = "MAX_VALUE";
  FreOverride[(FreOverride["kUnspecified"] = 0)] = "kUnspecified";
  FreOverride[(FreOverride["kTrustFirstText"] = 1)] = "kTrustFirstText";
  FreOverride[(FreOverride["kTrustFirstClick"] = 2)] = "kTrustFirstClick";
  FreOverride[(FreOverride["kTrustFirstInline"] = 3)] = "kTrustFirstInline";
})(FreOverride || (FreOverride = {}));
({ $: mojo.internal.Enum() });
var InvocationSource;
(function (InvocationSource) {
  InvocationSource[(InvocationSource["MIN_VALUE"] = 0)] = "MIN_VALUE";
  InvocationSource[(InvocationSource["MAX_VALUE"] = 44)] = "MAX_VALUE";
  InvocationSource[(InvocationSource["kOsButton"] = 0)] = "kOsButton";
  InvocationSource[(InvocationSource["kOsButtonMenu"] = 1)] = "kOsButtonMenu";
  InvocationSource[(InvocationSource["kOsHotkey"] = 2)] = "kOsHotkey";
  InvocationSource[(InvocationSource["kTopChromeButton"] = 3)] =
    "kTopChromeButton";
  InvocationSource[(InvocationSource["kFre"] = 4)] = "kFre";
  InvocationSource[(InvocationSource["kProfilePicker"] = 5)] = "kProfilePicker";
  InvocationSource[(InvocationSource["kNudge"] = 6)] = "kNudge";
  InvocationSource[(InvocationSource["kThreeDotsMenu"] = 7)] = "kThreeDotsMenu";
  InvocationSource[(InvocationSource["kUnsupported"] = 8)] = "kUnsupported";
  InvocationSource[(InvocationSource["kWhatsNew"] = 9)] = "kWhatsNew";
  InvocationSource[(InvocationSource["kAfterSignIn"] = 10)] = "kAfterSignIn";
  InvocationSource[(InvocationSource["kSharedTab"] = 11)] = "kSharedTab";
  InvocationSource[(InvocationSource["kActorTaskIcon"] = 12)] =
    "kActorTaskIcon";
  InvocationSource[(InvocationSource["kSharedImage"] = 13)] = "kSharedImage";
  InvocationSource[(InvocationSource["kHandoffButton"] = 14)] =
    "kHandoffButton";
  InvocationSource[(InvocationSource["kSkills"] = 15)] = "kSkills";
  InvocationSource[(InvocationSource["kAutoOpenedByContextualCue"] = 16)] =
    "kAutoOpenedByContextualCue";
  InvocationSource[(InvocationSource["kPdfSummarizeButton"] = 17)] =
    "kPdfSummarizeButton";
  InvocationSource[(InvocationSource["kNavigationCapture"] = 18)] =
    "kNavigationCapture";
  InvocationSource[(InvocationSource["kAutoOpenedForPdf"] = 19)] =
    "kAutoOpenedForPdf";
  InvocationSource[(InvocationSource["kCaptureRegionHotkey"] = 20)] =
    "kCaptureRegionHotkey";
  InvocationSource[(InvocationSource["kIph"] = 21)] = "kIph";
  InvocationSource[(InvocationSource["kAnchoredContextualCue"] = 22)] =
    "kAnchoredContextualCue";
  InvocationSource[(InvocationSource["kWebContentsContextMenu"] = 23)] =
    "kWebContentsContextMenu";
  InvocationSource[(InvocationSource["kTextSelectionNudge"] = 24)] =
    "kTextSelectionNudge";
  InvocationSource[(InvocationSource["kTextSelectionWidget"] = 25)] =
    "kTextSelectionWidget";
  InvocationSource[(InvocationSource["kZeroStateAutoSummarize"] = 26)] =
    "kZeroStateAutoSummarize";
  InvocationSource[(InvocationSource["kUniversalCart"] = 27)] =
    "kUniversalCart";
  InvocationSource[(InvocationSource["kExperimentalTriggering"] = 28)] =
    "kExperimentalTriggering";
  InvocationSource[(InvocationSource["kPasswordChange"] = 29)] =
    "kPasswordChange";
  InvocationSource[(InvocationSource["kAutofill"] = 30)] = "kAutofill";
  InvocationSource[(InvocationSource["kToolbarButton"] = 31)] =
    "kToolbarButton";
  InvocationSource[(InvocationSource["kIndigoPageAction"] = 32)] =
    "kIndigoPageAction";
  InvocationSource[(InvocationSource["kWebDragDrop"] = 33)] = "kWebDragDrop";
  InvocationSource[(InvocationSource["kPromotionPage"] = 34)] =
    "kPromotionPage";
  InvocationSource[(InvocationSource["kDaisyChainOnNewTab"] = 35)] =
    "kDaisyChainOnNewTab";
  InvocationSource[(InvocationSource["kDaisyChainOnFollowLink"] = 36)] =
    "kDaisyChainOnFollowLink";
  InvocationSource[(InvocationSource["kConversationSwitch"] = 37)] =
    "kConversationSwitch";
  InvocationSource[(InvocationSource["kDetachAttachButton"] = 38)] =
    "kDetachAttachButton";
  InvocationSource[(InvocationSource["kTabRestore"] = 39)] = "kTabRestore";
  InvocationSource[(InvocationSource["kReshowInactive"] = 40)] =
    "kReshowInactive";
  InvocationSource[(InvocationSource["kTabContextMenu"] = 41)] =
    "kTabContextMenu";
  InvocationSource[(InvocationSource["kWebContinuity"] = 42)] =
    "kWebContinuity";
  InvocationSource[(InvocationSource["kHistoryPageChatLinkout"] = 43)] =
    "kHistoryPageChatLinkout";
  InvocationSource[(InvocationSource["kContextHubTopics"] = 44)] =
    "kContextHubTopics";
})(InvocationSource || (InvocationSource = {}));
({ $: mojo.internal.Enum() });
var ActuationTarget;
(function (ActuationTarget) {
  ActuationTarget[(ActuationTarget["MIN_VALUE"] = 0)] = "MIN_VALUE";
  ActuationTarget[(ActuationTarget["MAX_VALUE"] = 4)] = "MAX_VALUE";
  ActuationTarget[(ActuationTarget["kUnknown"] = 0)] = "kUnknown";
  ActuationTarget[(ActuationTarget["kAgentDecides"] = 1)] = "kAgentDecides";
  ActuationTarget[(ActuationTarget["kCurrentTab"] = 2)] = "kCurrentTab";
  ActuationTarget[(ActuationTarget["kNewTab"] = 3)] = "kNewTab";
  ActuationTarget[(ActuationTarget["kTargetSurface"] = 4)] = "kTargetSurface";
})(ActuationTarget || (ActuationTarget = {}));
class JSTimeDataView {
  decoder_;
  version_;
  fieldSpecs_;
  constructor(decoder, version, fieldSpecs) {
    this.decoder_ = decoder;
    this.version_ = version;
    this.fieldSpecs_ = fieldSpecs;
  }
  get msec() {
    const field = this.fieldSpecs_[0];
    return mojo.internal.decodeStructField(this.decoder_, field, this.version_);
  }
}
class JsTimeConverter {
  msec(date) {
    return date.valueOf();
  }
  convert(view) {
    return new Date(view.msec);
  }
}
const TimeSpec = { $: {} };
const JSTimeSpec = { $: {} };
const TimeDeltaSpec = { $: {} };
const TimeTicksSpec = { $: {} };
mojo.internal.Struct(
  TimeSpec.$,
  "Time",
  [
    mojo.internal.StructField(
      "internalValue",
      0,
      0,
      mojo.internal.Int64,
      BigInt(0),
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
const converterForJSTime = new JsTimeConverter();
mojo.internal.TypemappedStruct(
  JSTimeSpec.$,
  "JSTime",
  JSTimeDataView,
  converterForJSTime,
  [
    mojo.internal.StructField(
      "msec",
      0,
      0,
      mojo.internal.Double,
      0,
      false,
      0,
      undefined,
      (value) => converterForJSTime.msec(value),
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  TimeDeltaSpec.$,
  "TimeDelta",
  [
    mojo.internal.StructField(
      "microseconds",
      0,
      0,
      mojo.internal.Int64,
      BigInt(0),
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
mojo.internal.Struct(
  TimeTicksSpec.$,
  "TimeTicks",
  [
    mojo.internal.StructField(
      "internalValue",
      0,
      0,
      mojo.internal.Int64,
      BigInt(0),
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 16]],
);
const PointSpec = { $: {} };
const PointFSpec = { $: {} };
const Point3FSpec = { $: {} };
const SizeSpec = { $: {} };
const SizeFSpec = { $: {} };
const RectSpec = { $: {} };
const RectFSpec = { $: {} };
const InsetsSpec = { $: {} };
const InsetsFSpec = { $: {} };
const Vector2dSpec = { $: {} };
const Vector2dFSpec = { $: {} };
const Vector3dFSpec = { $: {} };
const QuaternionSpec = { $: {} };
const QuadFSpec = { $: {} };
const AxisTransform2dSpec = { $: {} };
mojo.internal.Struct(
  PointSpec.$,
  "Point",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      4,
      0,
      mojo.internal.Int32,
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
  PointFSpec.$,
  "PointF",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      4,
      0,
      mojo.internal.Float,
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
  Point3FSpec.$,
  "Point3F",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      4,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "z",
      8,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  SizeSpec.$,
  "Size",
  [
    mojo.internal.StructField(
      "width",
      0,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "height",
      4,
      0,
      mojo.internal.Int32,
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
  SizeFSpec.$,
  "SizeF",
  [
    mojo.internal.StructField(
      "width",
      0,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "height",
      4,
      0,
      mojo.internal.Float,
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
  RectSpec.$,
  "Rect",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      4,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "width",
      8,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "height",
      12,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  RectFSpec.$,
  "RectF",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      4,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "width",
      8,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "height",
      12,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  InsetsSpec.$,
  "Insets",
  [
    mojo.internal.StructField(
      "top",
      0,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "left",
      4,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "bottom",
      8,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "right",
      12,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  InsetsFSpec.$,
  "InsetsF",
  [
    mojo.internal.StructField(
      "top",
      0,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "left",
      4,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "bottom",
      8,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "right",
      12,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  Vector2dSpec.$,
  "Vector2d",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      4,
      0,
      mojo.internal.Int32,
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
  Vector2dFSpec.$,
  "Vector2dF",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      4,
      0,
      mojo.internal.Float,
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
  Vector3dFSpec.$,
  "Vector3dF",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      4,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "z",
      8,
      0,
      mojo.internal.Float,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  QuaternionSpec.$,
  "Quaternion",
  [
    mojo.internal.StructField(
      "x",
      0,
      0,
      mojo.internal.Double,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "y",
      8,
      0,
      mojo.internal.Double,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "z",
      16,
      0,
      mojo.internal.Double,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "w",
      24,
      0,
      mojo.internal.Double,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 40]],
);
mojo.internal.Struct(
  QuadFSpec.$,
  "QuadF",
  [
    mojo.internal.StructField(
      "p1",
      0,
      0,
      PointFSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "p2",
      8,
      0,
      PointFSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "p3",
      16,
      0,
      PointFSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "p4",
      24,
      0,
      PointFSpec.$,
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
  AxisTransform2dSpec.$,
  "AxisTransform2d",
  [
    mojo.internal.StructField(
      "scale",
      0,
      0,
      Vector2dFSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "translation",
      8,
      0,
      Vector2dFSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
class UrlDataView {
  decoder_;
  version_;
  fieldSpecs_;
  constructor(decoder, version, fieldSpecs) {
    this.decoder_ = decoder;
    this.version_ = version;
    this.fieldSpecs_ = fieldSpecs;
  }
  get url() {
    const field = this.fieldSpecs_[0];
    return mojo.internal.decodeStructField(this.decoder_, field, this.version_);
  }
}
class UrlConverter {
  url(url) {
    return url;
  }
  convert(view) {
    return view.url;
  }
}
const UrlSpec = { $: {} };
const converterForUrl = new UrlConverter();
mojo.internal.TypemappedStruct(
  UrlSpec.$,
  "Url",
  UrlDataView,
  converterForUrl,
  [
    mojo.internal.StructField(
      "url",
      0,
      0,
      mojo.internal.String,
      null,
      false,
      0,
      undefined,
      (value) => converterForUrl.url(value),
    ),
  ],
  [[0, 16]],
);
const ProfileReadyStateSpec = { $: mojo.internal.Enum() };
var ProfileReadyState;
(function (ProfileReadyState) {
  ProfileReadyState[(ProfileReadyState["MIN_VALUE"] = 0)] = "MIN_VALUE";
  ProfileReadyState[(ProfileReadyState["MAX_VALUE"] = 6)] = "MAX_VALUE";
  ProfileReadyState[(ProfileReadyState["kUnknownError"] = 0)] = "kUnknownError";
  ProfileReadyState[(ProfileReadyState["kSignInRequired"] = 1)] =
    "kSignInRequired";
  ProfileReadyState[(ProfileReadyState["kReady"] = 2)] = "kReady";
  ProfileReadyState[(ProfileReadyState["kIneligible"] = 3)] = "kIneligible";
  ProfileReadyState[(ProfileReadyState["kDisabledByAdmin"] = 4)] =
    "kDisabledByAdmin";
  ProfileReadyState[(ProfileReadyState["kLocationMismatch"] = 5)] =
    "kLocationMismatch";
  ProfileReadyState[(ProfileReadyState["kIneligibleAccount"] = 6)] =
    "kIneligibleAccount";
})(ProfileReadyState || (ProfileReadyState = {}));
const ZoomActionSpec = { $: mojo.internal.Enum() };
var ZoomAction;
(function (ZoomAction) {
  ZoomAction[(ZoomAction["MIN_VALUE"] = 0)] = "MIN_VALUE";
  ZoomAction[(ZoomAction["MAX_VALUE"] = 2)] = "MAX_VALUE";
  ZoomAction[(ZoomAction["kZoomIn"] = 0)] = "kZoomIn";
  ZoomAction[(ZoomAction["kZoomOut"] = 1)] = "kZoomOut";
  ZoomAction[(ZoomAction["kReset"] = 2)] = "kReset";
})(ZoomAction || (ZoomAction = {}));
const WebClientStateSpec = { $: mojo.internal.Enum() };
var WebClientState;
(function (WebClientState) {
  WebClientState[(WebClientState["MIN_VALUE"] = 0)] = "MIN_VALUE";
  WebClientState[(WebClientState["MAX_VALUE"] = 4)] = "MAX_VALUE";
  WebClientState[(WebClientState["kUninitialized"] = 0)] = "kUninitialized";
  WebClientState[(WebClientState["kWarmed"] = 1)] = "kWarmed";
  WebClientState[(WebClientState["kResponsive"] = 2)] = "kResponsive";
  WebClientState[(WebClientState["kUnresponsive"] = 3)] = "kUnresponsive";
  WebClientState[(WebClientState["kError"] = 4)] = "kError";
})(WebClientState || (WebClientState = {}));
const GuestPageTypeSpec = { $: mojo.internal.Enum() };
var GuestPageType;
(function (GuestPageType) {
  GuestPageType[(GuestPageType["MIN_VALUE"] = 0)] = "MIN_VALUE";
  GuestPageType[(GuestPageType["MAX_VALUE"] = 4)] = "MAX_VALUE";
  GuestPageType[(GuestPageType["kRegular"] = 0)] = "kRegular";
  GuestPageType[(GuestPageType["kLogin"] = 1)] = "kLogin";
  GuestPageType[(GuestPageType["kGuestError"] = 2)] = "kGuestError";
  GuestPageType[(GuestPageType["kLoadError"] = 3)] = "kLoadError";
  GuestPageType[(GuestPageType["kDisabledByAdmin"] = 4)] = "kDisabledByAdmin";
})(GuestPageType || (GuestPageType = {}));
const WebUiStateSpec = { $: mojo.internal.Enum() };
var WebUiState;
(function (WebUiState) {
  WebUiState[(WebUiState["MIN_VALUE"] = 0)] = "MIN_VALUE";
  WebUiState[(WebUiState["MAX_VALUE"] = 15)] = "MAX_VALUE";
  WebUiState[(WebUiState["kUninitialized"] = 0)] = "kUninitialized";
  WebUiState[(WebUiState["kBeginLoad"] = 1)] = "kBeginLoad";
  WebUiState[(WebUiState["kShowLoading"] = 2)] = "kShowLoading";
  WebUiState[(WebUiState["kHoldLoading"] = 3)] = "kHoldLoading";
  WebUiState[(WebUiState["kFinishLoading"] = 4)] = "kFinishLoading";
  WebUiState[(WebUiState["kError"] = 5)] = "kError";
  WebUiState[(WebUiState["kOffline"] = 6)] = "kOffline";
  WebUiState[(WebUiState["kUnavailable"] = 7)] = "kUnavailable";
  WebUiState[(WebUiState["kReady"] = 8)] = "kReady";
  WebUiState[(WebUiState["kUnresponsive"] = 9)] = "kUnresponsive";
  WebUiState[(WebUiState["kSignIn"] = 10)] = "kSignIn";
  WebUiState[(WebUiState["kGuestError"] = 11)] = "kGuestError";
  WebUiState[(WebUiState["kDisabledByAdmin"] = 12)] = "kDisabledByAdmin";
  WebUiState[(WebUiState["kWarmed"] = 13)] = "kWarmed";
  WebUiState[(WebUiState["kLocationMismatch"] = 14)] = "kLocationMismatch";
  WebUiState[(WebUiState["kIneligibleAccount"] = 15)] = "kIneligibleAccount";
})(WebUiState || (WebUiState = {}));
const ClientLoadErrorReasonSpec = { $: mojo.internal.Enum() };
var ClientLoadErrorReason;
(function (ClientLoadErrorReason) {
  ClientLoadErrorReason[(ClientLoadErrorReason["MIN_VALUE"] = 0)] = "MIN_VALUE";
  ClientLoadErrorReason[(ClientLoadErrorReason["MAX_VALUE"] = 12)] =
    "MAX_VALUE";
  ClientLoadErrorReason[(ClientLoadErrorReason["kUnknown"] = 0)] = "kUnknown";
  ClientLoadErrorReason[(ClientLoadErrorReason["kUnavailable"] = 1)] =
    "kUnavailable";
  ClientLoadErrorReason[(ClientLoadErrorReason["kIneligibleAccount"] = 2)] =
    "kIneligibleAccount";
  ClientLoadErrorReason[(ClientLoadErrorReason["kLocationMismatch"] = 3)] =
    "kLocationMismatch";
  ClientLoadErrorReason[(ClientLoadErrorReason["kDisabledByAdmin"] = 4)] =
    "kDisabledByAdmin";
  ClientLoadErrorReason[(ClientLoadErrorReason["kOffline"] = 5)] = "kOffline";
  ClientLoadErrorReason[(ClientLoadErrorReason["kSignIn"] = 6)] = "kSignIn";
  ClientLoadErrorReason[(ClientLoadErrorReason["kCookieSyncFailed"] = 7)] =
    "kCookieSyncFailed";
  ClientLoadErrorReason[(ClientLoadErrorReason["kGuestLoadFailed"] = 8)] =
    "kGuestLoadFailed";
  ClientLoadErrorReason[(ClientLoadErrorReason["kGuestProcessGone"] = 9)] =
    "kGuestProcessGone";
  ClientLoadErrorReason[(ClientLoadErrorReason["kClientError"] = 10)] =
    "kClientError";
  ClientLoadErrorReason[(ClientLoadErrorReason["kClientLoadTimeout"] = 11)] =
    "kClientLoadTimeout";
  ClientLoadErrorReason[(ClientLoadErrorReason["kWarmedTimeout"] = 12)] =
    "kWarmedTimeout";
})(ClientLoadErrorReason || (ClientLoadErrorReason = {}));
const PrepareForClientResultSpec = { $: mojo.internal.Enum() };
var PrepareForClientResult;
(function (PrepareForClientResult) {
  PrepareForClientResult[(PrepareForClientResult["MIN_VALUE"] = 0)] =
    "MIN_VALUE";
  PrepareForClientResult[(PrepareForClientResult["MAX_VALUE"] = 2)] =
    "MAX_VALUE";
  PrepareForClientResult[(PrepareForClientResult["kSuccess"] = 0)] = "kSuccess";
  PrepareForClientResult[
    (PrepareForClientResult["kErrorResyncingCookies"] = 1)
  ] = "kErrorResyncingCookies";
  PrepareForClientResult[(PrepareForClientResult["kRequiresSignIn"] = 2)] =
    "kRequiresSignIn";
})(PrepareForClientResult || (PrepareForClientResult = {}));
const HelpCenterTopicSpec = { $: mojo.internal.Enum() };
var HelpCenterTopic;
(function (HelpCenterTopic) {
  HelpCenterTopic[(HelpCenterTopic["MIN_VALUE"] = 0)] = "MIN_VALUE";
  HelpCenterTopic[(HelpCenterTopic["MAX_VALUE"] = 1)] = "MAX_VALUE";
  HelpCenterTopic[(HelpCenterTopic["kLocationMismatch"] = 0)] =
    "kLocationMismatch";
  HelpCenterTopic[(HelpCenterTopic["kIneligibleAccount"] = 1)] =
    "kIneligibleAccount";
})(HelpCenterTopic || (HelpCenterTopic = {}));
class PreloadPagePendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.mojom.PreloadPage",
      scope,
    );
  }
}
class PreloadPageRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      PreloadPagePendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  setProfileReadyState(readyState) {
    this.proxy.sendMessage(
      699860867,
      PreloadPage_SetProfileReadyState_ParamsSpec.$,
      null,
      [readyState],
      false,
    );
  }
  onGuestNavigationStarted() {
    this.proxy.sendMessage(
      1940495041,
      PreloadPage_OnGuestNavigationStarted_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  onGuestNavigated(url, isApiAllowed, pageType, isInitialCommit) {
    this.proxy.sendMessage(
      2013928484,
      PreloadPage_OnGuestNavigated_ParamsSpec.$,
      null,
      [url, isApiAllowed, pageType, isInitialCommit],
      false,
    );
  }
  onGuestProcessGone() {
    this.proxy.sendMessage(
      306512680,
      PreloadPage_OnGuestProcessGone_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  webClientStateChanged(state) {
    this.proxy.sendMessage(
      1029818277,
      PreloadPage_WebClientStateChanged_ParamsSpec.$,
      null,
      [state],
      false,
    );
  }
}
class PreloadPageCallbackRouter {
  helper_internal_;
  $;
  router_;
  setProfileReadyState;
  onGuestNavigationStarted;
  onGuestNavigated;
  onGuestProcessGone;
  webClientStateChanged;
  onConnectionError;
  constructor() {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        PreloadPageRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.router_ = new mojo.internal.interfaceSupport.CallbackRouter();
    this.setProfileReadyState =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      699860867,
      PreloadPage_SetProfileReadyState_ParamsSpec.$,
      null,
      this.setProfileReadyState.createReceiverHandler(false),
      false,
    );
    this.onGuestNavigationStarted =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1940495041,
      PreloadPage_OnGuestNavigationStarted_ParamsSpec.$,
      null,
      this.onGuestNavigationStarted.createReceiverHandler(false),
      false,
    );
    this.onGuestNavigated =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      2013928484,
      PreloadPage_OnGuestNavigated_ParamsSpec.$,
      null,
      this.onGuestNavigated.createReceiverHandler(false),
      false,
    );
    this.onGuestProcessGone =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      306512680,
      PreloadPage_OnGuestProcessGone_ParamsSpec.$,
      null,
      this.onGuestProcessGone.createReceiverHandler(false),
      false,
    );
    this.webClientStateChanged =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1029818277,
      PreloadPage_WebClientStateChanged_ParamsSpec.$,
      null,
      this.webClientStateChanged.createReceiverHandler(false),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
  removeListener(id) {
    return this.router_.removeListener(id);
  }
}
class PagePendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(this.handle, "glic.mojom.Page", scope);
  }
}
class PageRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      PagePendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  intentToShow() {
    this.proxy.sendMessage(
      1926319016,
      Page_IntentToShow_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  setProfileReadyState(readyState) {
    this.proxy.sendMessage(
      1269255035,
      Page_SetProfileReadyState_ParamsSpec.$,
      null,
      [readyState],
      false,
    );
  }
  updatePageState(panelStateKind) {
    this.proxy.sendMessage(
      357861592,
      Page_UpdatePageState_ParamsSpec.$,
      null,
      [panelStateKind],
      false,
    );
  }
  clientReadyStateChanged(ready) {
    this.proxy.sendMessage(
      901341193,
      Page_ClientReadyStateChanged_ParamsSpec.$,
      null,
      [ready],
      false,
    );
  }
  zoom(action) {
    this.proxy.sendMessage(
      1547230367,
      Page_Zoom_ParamsSpec.$,
      null,
      [action],
      false,
    );
  }
}
class PageCallbackRouter {
  helper_internal_;
  $;
  router_;
  intentToShow;
  setProfileReadyState;
  updatePageState;
  clientReadyStateChanged;
  zoom;
  onConnectionError;
  constructor() {
    this.helper_internal_ =
      new mojo.internal.interfaceSupport.InterfaceReceiverHelperInternal(
        PageRemote,
      );
    this.$ = new mojo.internal.interfaceSupport.InterfaceReceiverHelper(
      this.helper_internal_,
    );
    this.router_ = new mojo.internal.interfaceSupport.CallbackRouter();
    this.intentToShow =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1926319016,
      Page_IntentToShow_ParamsSpec.$,
      null,
      this.intentToShow.createReceiverHandler(false),
      false,
    );
    this.setProfileReadyState =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      1269255035,
      Page_SetProfileReadyState_ParamsSpec.$,
      null,
      this.setProfileReadyState.createReceiverHandler(false),
      false,
    );
    this.updatePageState =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      357861592,
      Page_UpdatePageState_ParamsSpec.$,
      null,
      this.updatePageState.createReceiverHandler(false),
      false,
    );
    this.clientReadyStateChanged =
      new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
        this.router_,
      );
    this.helper_internal_.registerHandler(
      901341193,
      Page_ClientReadyStateChanged_ParamsSpec.$,
      null,
      this.clientReadyStateChanged.createReceiverHandler(false),
      false,
    );
    this.zoom = new mojo.internal.interfaceSupport.InterfaceCallbackReceiver(
      this.router_,
    );
    this.helper_internal_.registerHandler(
      1547230367,
      Page_Zoom_ParamsSpec.$,
      null,
      this.zoom.createReceiverHandler(false),
      false,
    );
    this.onConnectionError =
      this.helper_internal_.getConnectionErrorEventRouter();
  }
  removeListener(id) {
    return this.router_.removeListener(id);
  }
}
class GlicPreloadHandlerPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.mojom.GlicPreloadHandler",
      scope,
    );
  }
}
class GlicPreloadHandlerRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      GlicPreloadHandlerPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  prepareForClient() {
    return this.proxy.sendMessage(
      693584177,
      GlicPreloadHandler_PrepareForClient_ParamsSpec.$,
      GlicPreloadHandler_PrepareForClient_ResponseParamsSpec.$,
      [],
      false,
    );
  }
}
class GlicPreloadHandlerFactoryPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.mojom.GlicPreloadHandlerFactory",
      scope,
    );
  }
}
class GlicPreloadHandlerFactoryRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      GlicPreloadHandlerFactoryPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  createPreloadHandler(receiver, page) {
    this.proxy.sendMessage(
      1294713150,
      GlicPreloadHandlerFactory_CreatePreloadHandler_ParamsSpec.$,
      null,
      [receiver, page],
      false,
    );
  }
}
class GlicPreloadHandlerFactory {
  static get $interfaceName() {
    return "glic.mojom.GlicPreloadHandlerFactory";
  }
  static getRemote() {
    let remote = new GlicPreloadHandlerFactoryRemote();
    remote.$.bindNewPipeAndPassReceiver().bindInBrowser();
    return remote;
  }
}
class PageHandlerFactoryPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.mojom.PageHandlerFactory",
      scope,
    );
  }
}
class PageHandlerFactoryRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      PageHandlerFactoryPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  createPageHandler(receiver, page) {
    return this.proxy.sendMessage(
      1180825364,
      PageHandlerFactory_CreatePageHandler_ParamsSpec.$,
      PageHandlerFactory_CreatePageHandler_ResponseParamsSpec.$,
      [receiver, page],
      false,
    );
  }
}
class PageHandlerFactory {
  static get $interfaceName() {
    return "glic.mojom.PageHandlerFactory";
  }
  static getRemote() {
    let remote = new PageHandlerFactoryRemote();
    remote.$.bindNewPipeAndPassReceiver().bindInBrowser();
    return remote;
  }
}
class PageHandlerPendingReceiver {
  handle;
  constructor(handle) {
    this.handle = mojo.internal.interfaceSupport.getEndpointForReceiver(handle);
  }
  bindInBrowser(scope = "context") {
    mojo.internal.interfaceSupport.bind(
      this.handle,
      "glic.mojom.PageHandler",
      scope,
    );
  }
}
class PageHandlerRemote {
  proxy;
  $;
  onConnectionError;
  constructor(handle) {
    this.proxy = new mojo.internal.interfaceSupport.InterfaceRemoteBase(
      PageHandlerPendingReceiver,
      handle,
    );
    this.$ = new mojo.internal.interfaceSupport.InterfaceRemoteBaseWrapper(
      this.proxy,
    );
    this.onConnectionError = this.proxy.getConnectionErrorEventRouter();
  }
  prepareForClient() {
    return this.proxy.sendMessage(
      2060450267,
      PageHandler_PrepareForClient_ParamsSpec.$,
      PageHandler_PrepareForClient_ResponseParamsSpec.$,
      [],
      false,
    );
  }
  webviewCommitted(url) {
    this.proxy.sendMessage(
      452612076,
      PageHandler_WebviewCommitted_ParamsSpec.$,
      null,
      [url],
      false,
    );
  }
  openLinkInPopup(url, popupWidth, popupHeight) {
    this.proxy.sendMessage(
      1568053064,
      PageHandler_OpenLinkInPopup_ParamsSpec.$,
      null,
      [url, popupWidth, popupHeight],
      false,
    );
  }
  openLinkInNewTab(url) {
    this.proxy.sendMessage(
      158971986,
      PageHandler_OpenLinkInNewTab_ParamsSpec.$,
      null,
      [url],
      false,
    );
  }
  onZoomLevelChange(zoomFactor) {
    this.proxy.sendMessage(
      2059644305,
      PageHandler_OnZoomLevelChange_ParamsSpec.$,
      null,
      [zoomFactor],
      false,
    );
  }
  shouldAllowGeolocationPermissionRequest() {
    return this.proxy.sendMessage(
      1243888432,
      PageHandler_ShouldAllowGeolocationPermissionRequest_ParamsSpec.$,
      PageHandler_ShouldAllowGeolocationPermissionRequest_ResponseParamsSpec.$,
      [],
      false,
    );
  }
  closePanel() {
    return this.proxy.sendMessage(
      1913770959,
      PageHandler_ClosePanel_ParamsSpec.$,
      PageHandler_ClosePanel_ResponseParamsSpec.$,
      [],
      false,
    );
  }
  openHelpCenterTopicAndClosePanel(topic) {
    this.proxy.sendMessage(
      795897861,
      PageHandler_OpenHelpCenterTopicAndClosePanel_ParamsSpec.$,
      null,
      [topic],
      false,
    );
  }
  openProfilePickerAndClosePanel() {
    this.proxy.sendMessage(
      1544002035,
      PageHandler_OpenProfilePickerAndClosePanel_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  openDisabledByAdminLinkAndClosePanel() {
    this.proxy.sendMessage(
      353415951,
      PageHandler_OpenDisabledByAdminLinkAndClosePanel_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  signInAndClosePanel() {
    this.proxy.sendMessage(
      1738774e3,
      PageHandler_SignInAndClosePanel_ParamsSpec.$,
      null,
      [],
      false,
    );
  }
  resizeWidget(size, duration) {
    return this.proxy.sendMessage(
      1424761833,
      PageHandler_ResizeWidget_ParamsSpec.$,
      PageHandler_ResizeWidget_ResponseParamsSpec.$,
      [size, duration],
      false,
    );
  }
  onWebUiStateChanged(newState) {
    this.proxy.sendMessage(
      852492813,
      PageHandler_OnWebUiStateChanged_ParamsSpec.$,
      null,
      [newState],
      false,
    );
  }
  notifyClientLoadError(reason) {
    this.proxy.sendMessage(
      1135955554,
      PageHandler_NotifyClientLoadError_ParamsSpec.$,
      null,
      [reason],
      false,
    );
  }
  onClientLoadFailed(failed) {
    this.proxy.sendMessage(
      62516138,
      PageHandler_OnClientLoadFailed_ParamsSpec.$,
      null,
      [failed],
      false,
    );
  }
}
const PreloadPage_SetProfileReadyState_ParamsSpec = { $: {} };
const PreloadPage_OnGuestNavigationStarted_ParamsSpec = { $: {} };
const PreloadPage_OnGuestNavigated_ParamsSpec = { $: {} };
const PreloadPage_OnGuestProcessGone_ParamsSpec = { $: {} };
const PreloadPage_WebClientStateChanged_ParamsSpec = { $: {} };
const Page_IntentToShow_ParamsSpec = { $: {} };
const Page_SetProfileReadyState_ParamsSpec = { $: {} };
const Page_UpdatePageState_ParamsSpec = { $: {} };
const Page_ClientReadyStateChanged_ParamsSpec = { $: {} };
const Page_Zoom_ParamsSpec = { $: {} };
const GlicPreloadHandler_PrepareForClient_ParamsSpec = { $: {} };
const GlicPreloadHandler_PrepareForClient_ResponseParamsSpec = { $: {} };
const GlicPreloadHandlerFactory_CreatePreloadHandler_ParamsSpec = { $: {} };
const PageHandlerFactory_CreatePageHandler_ParamsSpec = { $: {} };
const PageHandlerFactory_CreatePageHandler_ResponseParamsSpec = { $: {} };
const PageHandler_PrepareForClient_ParamsSpec = { $: {} };
const PageHandler_PrepareForClient_ResponseParamsSpec = { $: {} };
const PageHandler_WebviewCommitted_ParamsSpec = { $: {} };
const PageHandler_OpenLinkInPopup_ParamsSpec = { $: {} };
const PageHandler_OpenLinkInNewTab_ParamsSpec = { $: {} };
const PageHandler_OnZoomLevelChange_ParamsSpec = { $: {} };
const PageHandler_ShouldAllowGeolocationPermissionRequest_ParamsSpec = {
  $: {},
};
const PageHandler_ShouldAllowGeolocationPermissionRequest_ResponseParamsSpec = {
  $: {},
};
const PageHandler_ClosePanel_ParamsSpec = { $: {} };
const PageHandler_ClosePanel_ResponseParamsSpec = { $: {} };
const PageHandler_OpenHelpCenterTopicAndClosePanel_ParamsSpec = { $: {} };
const PageHandler_OpenProfilePickerAndClosePanel_ParamsSpec = { $: {} };
const PageHandler_OpenDisabledByAdminLinkAndClosePanel_ParamsSpec = { $: {} };
const PageHandler_SignInAndClosePanel_ParamsSpec = { $: {} };
const PageHandler_ResizeWidget_ParamsSpec = { $: {} };
const PageHandler_ResizeWidget_ResponseParamsSpec = { $: {} };
const PageHandler_OnWebUiStateChanged_ParamsSpec = { $: {} };
const PageHandler_NotifyClientLoadError_ParamsSpec = { $: {} };
const PageHandler_OnClientLoadFailed_ParamsSpec = { $: {} };
mojo.internal.Struct(
  PreloadPage_SetProfileReadyState_ParamsSpec.$,
  "PreloadPage_SetProfileReadyState_Params",
  [
    mojo.internal.StructField(
      "readyState",
      0,
      0,
      ProfileReadyStateSpec.$,
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
  PreloadPage_OnGuestNavigationStarted_ParamsSpec.$,
  "PreloadPage_OnGuestNavigationStarted_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PreloadPage_OnGuestNavigated_ParamsSpec.$,
  "PreloadPage_OnGuestNavigated_Params",
  [
    mojo.internal.StructField(
      "url",
      0,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isApiAllowed",
      8,
      0,
      mojo.internal.Bool,
      false,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "pageType",
      12,
      0,
      GuestPageTypeSpec.$,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "isInitialCommit",
      8,
      1,
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
  PreloadPage_OnGuestProcessGone_ParamsSpec.$,
  "PreloadPage_OnGuestProcessGone_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PreloadPage_WebClientStateChanged_ParamsSpec.$,
  "PreloadPage_WebClientStateChanged_Params",
  [
    mojo.internal.StructField(
      "state",
      0,
      0,
      WebClientStateSpec.$,
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
  Page_IntentToShow_ParamsSpec.$,
  "Page_IntentToShow_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  Page_SetProfileReadyState_ParamsSpec.$,
  "Page_SetProfileReadyState_Params",
  [
    mojo.internal.StructField(
      "readyState",
      0,
      0,
      ProfileReadyStateSpec.$,
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
  Page_UpdatePageState_ParamsSpec.$,
  "Page_UpdatePageState_Params",
  [
    mojo.internal.StructField(
      "panelStateKind",
      0,
      0,
      PanelStateKindSpec.$,
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
  Page_ClientReadyStateChanged_ParamsSpec.$,
  "Page_ClientReadyStateChanged_Params",
  [
    mojo.internal.StructField(
      "ready",
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
  Page_Zoom_ParamsSpec.$,
  "Page_Zoom_Params",
  [
    mojo.internal.StructField(
      "action",
      0,
      0,
      ZoomActionSpec.$,
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
  GlicPreloadHandler_PrepareForClient_ParamsSpec.$,
  "GlicPreloadHandler_PrepareForClient_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  GlicPreloadHandler_PrepareForClient_ResponseParamsSpec.$,
  "GlicPreloadHandler_PrepareForClient_ResponseParams",
  [
    mojo.internal.StructField(
      "result",
      0,
      0,
      PrepareForClientResultSpec.$,
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
  GlicPreloadHandlerFactory_CreatePreloadHandler_ParamsSpec.$,
  "GlicPreloadHandlerFactory_CreatePreloadHandler_Params",
  [
    mojo.internal.StructField(
      "receiver",
      0,
      0,
      mojo.internal.InterfaceRequest(GlicPreloadHandlerPendingReceiver),
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
      mojo.internal.InterfaceProxy(PreloadPageRemote),
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
  PageHandlerFactory_CreatePageHandler_ParamsSpec.$,
  "PageHandlerFactory_CreatePageHandler_Params",
  [
    mojo.internal.StructField(
      "receiver",
      0,
      0,
      mojo.internal.InterfaceRequest(PageHandlerPendingReceiver),
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
      mojo.internal.InterfaceProxy(PageRemote),
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
  PageHandlerFactory_CreatePageHandler_ResponseParamsSpec.$,
  "PageHandlerFactory_CreatePageHandler_ResponseParams",
  [
    mojo.internal.StructField(
      "instanceId",
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
  PageHandler_PrepareForClient_ParamsSpec.$,
  "PageHandler_PrepareForClient_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PageHandler_PrepareForClient_ResponseParamsSpec.$,
  "PageHandler_PrepareForClient_ResponseParams",
  [
    mojo.internal.StructField(
      "result",
      0,
      0,
      PrepareForClientResultSpec.$,
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
  PageHandler_WebviewCommitted_ParamsSpec.$,
  "PageHandler_WebviewCommitted_Params",
  [
    mojo.internal.StructField(
      "url",
      0,
      0,
      UrlSpec.$,
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
  PageHandler_OpenLinkInPopup_ParamsSpec.$,
  "PageHandler_OpenLinkInPopup_Params",
  [
    mojo.internal.StructField(
      "url",
      0,
      0,
      UrlSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "popupWidth",
      8,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "popupHeight",
      12,
      0,
      mojo.internal.Int32,
      0,
      false,
      0,
      undefined,
      undefined,
    ),
  ],
  [[0, 24]],
);
mojo.internal.Struct(
  PageHandler_OpenLinkInNewTab_ParamsSpec.$,
  "PageHandler_OpenLinkInNewTab_Params",
  [
    mojo.internal.StructField(
      "url",
      0,
      0,
      UrlSpec.$,
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
  PageHandler_OnZoomLevelChange_ParamsSpec.$,
  "PageHandler_OnZoomLevelChange_Params",
  [
    mojo.internal.StructField(
      "zoomFactor",
      0,
      0,
      mojo.internal.Double,
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
  PageHandler_ShouldAllowGeolocationPermissionRequest_ParamsSpec.$,
  "PageHandler_ShouldAllowGeolocationPermissionRequest_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PageHandler_ShouldAllowGeolocationPermissionRequest_ResponseParamsSpec.$,
  "PageHandler_ShouldAllowGeolocationPermissionRequest_ResponseParams",
  [
    mojo.internal.StructField(
      "isAllowed",
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
  PageHandler_ClosePanel_ParamsSpec.$,
  "PageHandler_ClosePanel_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PageHandler_ClosePanel_ResponseParamsSpec.$,
  "PageHandler_ClosePanel_ResponseParams",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PageHandler_OpenHelpCenterTopicAndClosePanel_ParamsSpec.$,
  "PageHandler_OpenHelpCenterTopicAndClosePanel_Params",
  [
    mojo.internal.StructField(
      "topic",
      0,
      0,
      HelpCenterTopicSpec.$,
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
  PageHandler_OpenProfilePickerAndClosePanel_ParamsSpec.$,
  "PageHandler_OpenProfilePickerAndClosePanel_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PageHandler_OpenDisabledByAdminLinkAndClosePanel_ParamsSpec.$,
  "PageHandler_OpenDisabledByAdminLinkAndClosePanel_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PageHandler_SignInAndClosePanel_ParamsSpec.$,
  "PageHandler_SignInAndClosePanel_Params",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PageHandler_ResizeWidget_ParamsSpec.$,
  "PageHandler_ResizeWidget_Params",
  [
    mojo.internal.StructField(
      "size",
      0,
      0,
      SizeSpec.$,
      null,
      false,
      0,
      undefined,
      undefined,
    ),
    mojo.internal.StructField(
      "duration",
      8,
      0,
      TimeDeltaSpec.$,
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
  PageHandler_ResizeWidget_ResponseParamsSpec.$,
  "PageHandler_ResizeWidget_ResponseParams",
  [],
  [[0, 8]],
);
mojo.internal.Struct(
  PageHandler_OnWebUiStateChanged_ParamsSpec.$,
  "PageHandler_OnWebUiStateChanged_Params",
  [
    mojo.internal.StructField(
      "newState",
      0,
      0,
      WebUiStateSpec.$,
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
  PageHandler_NotifyClientLoadError_ParamsSpec.$,
  "PageHandler_NotifyClientLoadError_Params",
  [
    mojo.internal.StructField(
      "reason",
      0,
      0,
      ClientLoadErrorReasonSpec.$,
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
  PageHandler_OnClientLoadFailed_ParamsSpec.$,
  "PageHandler_OnClientLoadFailed_Params",
  [
    mojo.internal.StructField(
      "failed",
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
function assertNotReachedCase(_param, message) {
  throw new Error("Assertion failed" + "");
}
class ObservableSubscription {
  observer;
  onUnsubscribe;
  constructor(observer, onUnsubscribe) {
    this.observer = observer;
    this.onUnsubscribe = onUnsubscribe;
  }
  unsubscribe() {
    this.onUnsubscribe(this);
  }
}
class ObservableBase {
  subscribers = new Set();
  state_ = "active";
  errorValue;
  next(value) {
    switch (this.state_) {
      case "active":
        break;
      case "complete":
      case "error":
        throw new Error("Observable is not active");
      default:
        assertNotReachedCase(this.state_);
    }
    this.subscribers.forEach((sub) => {
      if (this.subscribers.has(sub)) {
        try {
          sub.observer.next?.(value);
        } catch (e) {
          console.warn(e);
        }
      }
    });
  }
  error(e) {
    switch (this.state_) {
      case "active":
        this.state_ = "error";
        this.errorValue = e;
        break;
      case "complete":
      case "error":
        throw new Error("Observable is not active");
      default:
        assertNotReachedCase(this.state_);
    }
    let loggedWarning = false;
    const hadSubscribers = this.hasActiveSubscription();
    this.subscribers.forEach((sub) => {
      if (this.subscribers.has(sub)) {
        if (sub.observer.error) {
          try {
            sub.observer.error(e);
          } catch (e) {
            console.warn(e);
          }
        } else {
          if (!loggedWarning) {
            console.warn("unhandled error: ", e);
            loggedWarning = true;
          }
        }
      }
    });
    this.subscribers.clear();
    if (hadSubscribers) {
      this.activeSubscriptionChanged(false);
    }
  }
  complete() {
    switch (this.state_) {
      case "active":
        this.state_ = "complete";
        break;
      case "complete":
      case "error":
        throw new Error("Observable is not active");
      default:
        assertNotReachedCase(this.state_);
    }
    const hadSubscribers = this.hasActiveSubscription();
    this.subscribers.forEach((sub) => {
      if (this.subscribers.has(sub)) {
        try {
          sub.observer.complete?.();
        } catch (e) {
          console.warn(e);
        }
      }
    });
    this.subscribers.clear();
    if (hadSubscribers) {
      this.activeSubscriptionChanged(false);
    }
  }
  isStopped() {
    return this.state_ !== "active";
  }
  subscribe(changeOrObserver) {
    if (typeof changeOrObserver === "function") {
      return this.subscribeObserver({
        next: (value) => {
          changeOrObserver(value);
        },
      });
    } else {
      return this.subscribeObserver(changeOrObserver);
    }
  }
  subscribeObserver(observer) {
    switch (this.state_) {
      case "active":
        break;
      case "complete":
        observer.complete?.();
        return { unsubscribe: () => {} };
      case "error":
        observer.error?.(this.errorValue);
        return { unsubscribe: () => {} };
      default:
        assertNotReachedCase(this.state_);
    }
    const newSub = new ObservableSubscription(
      observer,
      this.onUnsubscribe.bind(this),
    );
    if (this.subscribers.size === 0) {
      this.activeSubscriptionChanged(true);
    }
    this.subscribers.add(newSub);
    this.subscriberAdded(newSub);
    return newSub;
  }
  onUnsubscribe(sub) {
    if (!this.subscribers) {
      return;
    }
    if (this.subscribers.size === 0) {
      return;
    }
    this.subscribers.delete(sub);
    if (this.subscribers.size === 0) {
      this.activeSubscriptionChanged(false);
    }
  }
  subscriberAdded(_sub) {}
  activeSubscriptionChanged(_hasActiveSubscription) {}
  hasActiveSubscription() {
    return this.subscribers.size > 0;
  }
}
class Subject extends ObservableBase {
  next(value) {
    super.next(value);
  }
}
class ObservableValue extends Subject {
  isSet;
  value;
  hasActiveSubscriptionCallback;
  constructor(isSet, value, hasActiveSubscriptionCallback) {
    super();
    this.isSet = isSet;
    this.value = value;
    this.hasActiveSubscriptionCallback = hasActiveSubscriptionCallback;
  }
  static withValue(value, hasActiveSubscriptionCallback) {
    return new ObservableValue(true, value, hasActiveSubscriptionCallback);
  }
  static withNoValue(hasActiveSubscriptionCallback) {
    return new ObservableValue(false, undefined, hasActiveSubscriptionCallback);
  }
  assignAndSignal(v, force = false) {
    if (this.isStopped()) {
      throw new Error("ObservableValue is not active");
    }
    const send = !this.isSet || this.value !== v || force;
    this.isSet = true;
    this.value = v;
    if (!send) {
      return;
    }
    super.next(v);
  }
  getCurrentValue() {
    return this.value;
  }
  async waitUntil(criteria) {
    const {
      promise: promise,
      resolve: resolve,
      reject: reject,
    } = Promise.withResolvers();
    const sub = this.subscribe({
      next(newValue) {
        if (criteria(newValue)) {
          resolve(newValue);
        }
      },
      error: reject,
      complete() {
        reject(new Error("Observable completed"));
      },
    });
    let resultValue;
    try {
      resultValue = await promise;
    } finally {
      sub.unsubscribe();
    }
    return resultValue;
  }
  subscriberAdded(sub) {
    if (this.isSet) {
      sub.observer.next?.(this.value);
    }
  }
  activeSubscriptionChanged(hasActiveSubscription) {
    super.activeSubscriptionChanged(hasActiveSubscription);
    this.hasActiveSubscriptionCallback?.(hasActiveSubscription);
  }
}
const kEnableDebug = loadTimeData.getBoolean("enableDebug");
class BrowserProxyImpl {
  pageHandler;
  pageCallbackRouter;
  glicPreloadHandler;
  preloadPageCallbackRouter;
  instanceId = ObservableValue.withNoValue();
  constructor() {
    this.pageCallbackRouter = new PageCallbackRouter();
    this.preloadPageCallbackRouter = new PreloadPageCallbackRouter();
    const pageHandlerRemote = new PageHandlerRemote();
    if (!kEnableDebug) {
      this.pageHandler = pageHandlerRemote;
    } else {
      this.pageHandler = new Proxy(pageHandlerRemote, {
        get(target, name, receiver) {
          const prop = Reflect.get(target, name, receiver);
          if (!target.hasOwnProperty(name)) {
            if (typeof prop === "function") {
              return function (...args) {
                console.log("PageHandler#", name, args);
                return prop.apply(this, args);
              };
            }
          }
          return prop;
        },
      });
    }
    PageHandlerFactory.getRemote()
      .createPageHandler(
        this.pageHandler.$.bindNewPipeAndPassReceiver(),
        this.pageCallbackRouter.$.bindNewPipeAndPassRemote(),
      )
      .then(({ instanceId: instanceId }) => {
        this.instanceId.assignAndSignal(instanceId);
      });
    const preloadHandlerRemote = new GlicPreloadHandlerRemote();
    this.glicPreloadHandler = preloadHandlerRemote;
    GlicPreloadHandlerFactory.getRemote().createPreloadHandler(
      this.glicPreloadHandler.$.bindNewPipeAndPassReceiver(),
      this.preloadPageCallbackRouter.$.bindNewPipeAndPassRemote(),
    );
  }
}
let instance = null;
function getCss() {
  return (
    instance ||
    (instance = [
      ...[],
      css`
        :host {
          clip: rect(0 0 0 0);
          height: 1px;
          overflow: hidden;
          position: fixed;
          width: 1px;
        }
      `,
    ])
  );
}
function getHtml() {
  return html` <div
    id="messages"
    role="alert"
    aria-live="polite"
    aria-relevant="additions"
  ></div>`;
}
const TIMEOUT_MS = 150;
const instances = new Map();
function getInstance(container = document.body) {
  if (instances.has(container)) {
    return instances.get(container);
  }
  assert(container.isConnected);
  const instance = new CrA11yAnnouncerElement();
  container.appendChild(instance);
  instances.set(container, instance);
  return instance;
}
class CrA11yAnnouncerElement extends CrLitElement {
  static get is() {
    return "cr-a11y-announcer";
  }
  static get styles() {
    return getCss();
  }
  render() {
    return getHtml.bind(this)();
  }
  currentTimeout_ = null;
  messages_ = [];
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.currentTimeout_ !== null) {
      clearTimeout(this.currentTimeout_);
      this.currentTimeout_ = null;
    }
    for (const [parent, instance] of instances) {
      if (instance === this) {
        instances.delete(parent);
        break;
      }
    }
  }
  announce(message, timeout = TIMEOUT_MS) {
    if (this.currentTimeout_ !== null) {
      clearTimeout(this.currentTimeout_);
      this.currentTimeout_ = null;
    }
    this.messages_.push(message);
    this.currentTimeout_ = setTimeout(() => {
      const messagesDiv = this.shadowRoot.querySelector("#messages");
      messagesDiv.innerHTML = window.trustedTypes.emptyHTML;
      for (const message of this.messages_) {
        const div = document.createElement("div");
        div.textContent = message;
        messagesDiv.appendChild(div);
      }
      this.dispatchEvent(
        new CustomEvent("cr-a11y-announcer-messages-sent", {
          bubbles: true,
          detail: { messages: this.messages_.slice() },
        }),
      );
      this.messages_.length = 0;
      this.currentTimeout_ = null;
    }, timeout);
  }
}
customElements.define(CrA11yAnnouncerElement.is, CrA11yAnnouncerElement);
function isFullWebView(webview) {
  return webview.constructor === window.WebView;
}
class GlicRequestHeaderInjector {
  chromeVersion;
  chromeChannel;
  onDestroy = () => {};
  constructor(webview, chromeVersion, chromeChannel, requestTypes) {
    this.chromeVersion = chromeVersion;
    this.chromeChannel = chromeChannel;
    if (requestTypes === "") {
      return;
    }
    if (isFullWebView(webview)) {
      const onBeforeSendHeaders = this.onBeforeSendHeaders.bind(this);
      webview.request.onBeforeSendHeaders.addListener(
        onBeforeSendHeaders,
        { types: requestTypes.split(","), urls: ["<all_urls>"] },
        ["blocking", "requestHeaders", "extraHeaders"],
      );
      this.onDestroy = () => {
        webview.request.onBeforeSendHeaders.removeListener(onBeforeSendHeaders);
      };
    }
  }
  destroy() {
    this.onDestroy();
  }
  onBeforeSendHeaders = (details) => {
    if (details.frameId !== 0) {
      return {};
    }
    const requestHeaders = details.requestHeaders || [];
    requestHeaders.push(...this.headers());
    return { requestHeaders: requestHeaders };
  };
  headers() {
    return [
      { name: "X-Glic", value: "1" },
      { name: "X-Glic-Chrome-Version", value: this.chromeVersion },
      { name: "X-Glic-Chrome-Channel", value: this.chromeChannel },
    ];
  }
}
const ZOOM_FACTORS = [1, 1.1, 1.25, 1.5, 1.75, 2];
const ZOOM_DELTA_THRESHOLD = 0.01;
function findNextZoomInFactor(currentZoom) {
  return ZOOM_FACTORS.find((f) => f - currentZoom >= ZOOM_DELTA_THRESHOLD);
}
function findNextZoomOutFactor(currentZoom) {
  return ZOOM_FACTORS.findLast((f) => currentZoom - f >= ZOOM_DELTA_THRESHOLD);
}
function isZoomChangeEvent(e) {
  return "newZoomFactor" in e && typeof e.newZoomFactor === "number";
}
class WebviewPersistentState {
  loadUrl;
  loadUrlUsed = false;
  useLoadUrl() {
    if (this.loadUrl && !this.loadUrlUsed) {
      this.loadUrlUsed = true;
      return this.loadUrl;
    } else {
      return loadTimeData.getString("glicGuestURL");
    }
  }
  onCommitAfterConnect(newUrl) {
    this.loadUrl = newUrl;
    this.loadUrlUsed = false;
  }
  onClientReady() {
    this.loadUrlUsed = false;
  }
}
class WebviewController {
  container;
  browserProxy;
  delegate;
  persistentState;
  webview;
  onDestroy = [];
  eventTracker = new EventTracker();
  webClientState = ObservableValue.withValue(WebClientState.kUninitialized);
  glicRequestHeaderInjector;
  displayScaleMultiplier = 1;
  webClientStateListenerId;
  bootstrapTimeoutId;
  stopBootstrapPing() {
    if (this.bootstrapTimeoutId !== undefined) {
      window.clearTimeout(this.bootstrapTimeoutId);
      this.bootstrapTimeoutId = undefined;
    }
  }
  constructor(container, browserProxy, delegate, persistentState) {
    this.container = container;
    this.browserProxy = browserProxy;
    this.delegate = delegate;
    this.persistentState = persistentState;
    this.webview = document.createElement("webview");
    this.webview.setAttribute("allowpopups", "true");
    this.glicRequestHeaderInjector = new GlicRequestHeaderInjector(
      this.webview,
      loadTimeData.getString("chromeVersion"),
      loadTimeData.getString("chromeChannel"),
      loadTimeData.getString("glicHeaderRequestTypes"),
    );
    this.webClientStateListenerId =
      this.browserProxy.preloadPageCallbackRouter.webClientStateChanged.addListener(
        (state) => {
          this.webClientState.assignAndSignal(state);
          switch (state) {
            case WebClientState.kWarmed:
              this.stopBootstrapPing();
              break;
            case WebClientState.kResponsive:
              this.stopBootstrapPing();
              this.persistentState.onClientReady();
              break;
            case WebClientState.kError:
              this.destroyHost(WebClientState.kError);
              break;
          }
        },
      );
    this.webview.id = "guestFrame";
    this.webview.setAttribute("partition", "persist:glicpart");
    this.container.appendChild(this.webview);
    this.eventTracker.add(this.webview, "loadstop", this.onLoadStop.bind(this));
    this.eventTracker.add(
      this.webview,
      "newwindow",
      this.onNewWindow.bind(this),
    );
    this.eventTracker.add(
      this.webview,
      "permissionrequest",
      this.onPermissionRequest.bind(this),
    );
    this.eventTracker.add(this.webview, "exit", this.onExit.bind(this));
    this.eventTracker.add(this.webview, "zoomchange", (e) => {
      if (!isZoomChangeEvent(e)) {
        return;
      }
      const percentage = Math.round(e.newZoomFactor * 100);
      const message = loadTimeData.getStringF("zoomLabel", percentage + "%");
      getInstance().announce(message);
      if (e.newZoomFactor > 0) {
        this.webview.getZoom((reportedZoom) => {
          this.displayScaleMultiplier = reportedZoom / e.newZoomFactor;
        });
      }
      this.browserProxy.pageHandler.onZoomLevelChange(e.newZoomFactor);
    });
    this.webview.src = this.persistentState.useLoadUrl();
  }
  getWebClientState() {
    return this.webClientState;
  }
  focus() {
    this.webview.focus();
  }
  destroy() {
    if (this.webClientStateListenerId !== undefined) {
      this.browserProxy.preloadPageCallbackRouter.removeListener(
        this.webClientStateListenerId,
      );
      this.webClientStateListenerId = undefined;
    }
    if (this.glicRequestHeaderInjector !== undefined) {
      this.glicRequestHeaderInjector.destroy();
      this.glicRequestHeaderInjector = undefined;
    }
    this.destroyHost(
      this.webClientState.getCurrentValue() === WebClientState.kError
        ? WebClientState.kError
        : WebClientState.kUninitialized,
    );
    this.eventTracker.removeAll();
    this.onDestroy.forEach((f) => f());
    this.onDestroy = [];
    this.webview.remove();
  }
  destroyHost(webClientState) {
    this.stopBootstrapPing();
    if (webClientState !== undefined) {
      this.webClientState.assignAndSignal(webClientState);
    }
  }
  zoom(zoomAction) {
    const webview = this.webview;
    if (zoomAction === ZoomAction.kReset) {
      webview.setZoom(1);
      return;
    }
    webview.getZoom((reportedZoom) => {
      const activeZoom = reportedZoom / (this.displayScaleMultiplier || 1);
      const newFactor =
        zoomAction === ZoomAction.kZoomIn
          ? findNextZoomInFactor(activeZoom)
          : findNextZoomOutFactor(activeZoom);
      if (newFactor !== undefined) {
        webview.setZoom(newFactor);
      }
    });
  }
  onLoadStop() {
    if (this.webview.checkVisibility()) {
      this.webview.focus();
    }
  }
  onNewWindow(e) {
    this.onNewWindowEvent(e);
  }
  async onPermissionRequest(e) {
    e.preventDefault();
    switch (e.permission) {
      case "media": {
        e.request.allow();
        return;
      }
      case "geolocation": {
        const { isAllowed: isAllowed } =
          await this.browserProxy.pageHandler.shouldAllowGeolocationPermissionRequest();
        if (isAllowed) {
          e.request.allow();
        } else {
          e.request.deny();
        }
        return;
      }
    }
    console.warn(`Webview permission request was denied: ${e.permission}`);
    e.request.deny();
  }
  onExit(event) {
    if (event.reason !== "normal") {
      this.destroyHost(WebClientState.kError);
      chrome.histograms.recordUserAction("GlicSessionWebClientCrash");
      console.warn(
        `webview exit. processId: ${event.processId}, reason: ${event.reason}`,
      );
    }
  }
  onGuestNavigationStarted() {}
  onGuestNavigated(url, isApiAllowed, pageType, _isInitialCommit) {
    if (this.getWebClientState().getCurrentValue() === WebClientState.kError) {
      return;
    }
    const wasResponsive =
      this.getWebClientState().getCurrentValue() === WebClientState.kResponsive;
    this.destroyHost();
    if (pageType !== GuestPageType.kRegular || !isApiAllowed) {
      this.delegate.webviewPageCommit(
        pageType === GuestPageType.kRegular
          ? GuestPageType.kLoadError
          : pageType,
        isApiAllowed,
      );
      return;
    }
    const urlObj = URL.parse(url);
    if (urlObj && this.webview.contentWindow && isApiAllowed) {
      const contentWindow = this.webview.contentWindow;
      const origin = urlObj.origin;
      this.stopBootstrapPing();
      let delayMs = 50;
      const maxDelayMs = 1e3;
      const sendBootstrap = () => {
        try {
          contentWindow.postMessage(
            {
              type: "glic-bootstrap",
              glicApiSource: loadTimeData.getString("glicGuestAPISource"),
            },
            origin,
          );
        } catch (e) {
          console.warn("Failed to postMessage glic-bootstrap to guest:", e);
        }
        if (this.bootstrapTimeoutId !== undefined) {
          this.bootstrapTimeoutId = window.setTimeout(sendBootstrap, delayMs);
          delayMs = Math.min(delayMs * 2, maxDelayMs);
        }
      };
      this.bootstrapTimeoutId = -1;
      sendBootstrap();
    }
    this.browserProxy.pageHandler.webviewCommitted(url);
    if (wasResponsive) {
      this.persistentState.onCommitAfterConnect(url);
    }
    if (!_isInitialCommit) {
      this.delegate.webviewPageCommit(GuestPageType.kRegular, isApiAllowed);
    }
  }
  onNewWindowEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    if (
      loadTimeData.getBoolean("glicPopupWindowsEnabled") &&
      event.windowOpenDisposition === "new_popup"
    ) {
      this.browserProxy.pageHandler.openLinkInPopup(
        event.targetUrl,
        event.initialWidth,
        event.initialHeight,
      );
    } else {
      this.browserProxy.pageHandler.openLinkInNewTab(event.targetUrl);
    }
  }
}
const kPreHoldLoadingTimeMs = loadTimeData.getInteger("preLoadingTimeMs");
const kMinHoldLoadingTimeMs = loadTimeData.getInteger("minLoadingTimeMs");
const kMaxWaitTimeMs = loadTimeData.getInteger("maxLoadingTimeMs");
const kShowErrorAllowed = loadTimeData.getBoolean("showErrorAllowed");
const $ = new Proxy(
  {},
  {
    get(_target, prop) {
      return getRequiredElement(prop);
    },
  },
);
var LoadingStage;
(function (LoadingStage) {
  LoadingStage[(LoadingStage["NOT_LOADING"] = 0)] = "NOT_LOADING";
  LoadingStage[(LoadingStage["AWAITING_PROFILE_READY"] = 1)] =
    "AWAITING_PROFILE_READY";
  LoadingStage[(LoadingStage["AWAITING_COOKIE_SYNC"] = 2)] =
    "AWAITING_COOKIE_SYNC";
  LoadingStage[(LoadingStage["LOADING_WEB_CLIENT"] = 3)] = "LOADING_WEB_CLIENT";
  LoadingStage[(LoadingStage["AWAITING_NOTIFY_PANEL_WILL_OPEN"] = 4)] =
    "AWAITING_NOTIFY_PANEL_WILL_OPEN";
  LoadingStage[(LoadingStage["MAX_VALUE"] = 4)] = "MAX_VALUE";
})(LoadingStage || (LoadingStage = {}));
var WebUiErrorReason;
(function (WebUiErrorReason) {
  WebUiErrorReason[(WebUiErrorReason["WEBVIEW_ERROR"] = 0)] = "WEBVIEW_ERROR";
  WebUiErrorReason[(WebUiErrorReason["LOAD_ERROR"] = 1)] = "LOAD_ERROR";
  WebUiErrorReason[(WebUiErrorReason["COOKIE_SYNC_ERROR"] = 2)] =
    "COOKIE_SYNC_ERROR";
  WebUiErrorReason[(WebUiErrorReason["TIMEOUT_NOTIFY_PANEL_WILL_OPEN"] = 3)] =
    "TIMEOUT_NOTIFY_PANEL_WILL_OPEN";
  WebUiErrorReason[(WebUiErrorReason["TIMEOUT_LOADING_CLIENT"] = 4)] =
    "TIMEOUT_LOADING_CLIENT";
  WebUiErrorReason[(WebUiErrorReason["TIMEOUT_WARMED"] = 5)] = "TIMEOUT_WARMED";
  WebUiErrorReason[(WebUiErrorReason["CLIENT_ERROR"] = 6)] = "CLIENT_ERROR";
  WebUiErrorReason[(WebUiErrorReason["DEPRECATED_CLOSE_DEBUG_VIEW"] = 7)] =
    "DEPRECATED_CLOSE_DEBUG_VIEW";
  WebUiErrorReason[(WebUiErrorReason["MAX_VALUE"] = 7)] = "MAX_VALUE";
})(WebUiErrorReason || (WebUiErrorReason = {}));
class GlicAppController {
  loadingTimer;
  isFreCompleted = loadTimeData.getBoolean("completedFre");
  simulateNoConnection = loadTimeData.getBoolean("simulateNoConnection");
  webview;
  get webviewForTesting() {
    return this.webview;
  }
  webviewPersistentState = new WebviewPersistentState();
  profileReadyState = undefined;
  profileReadyInitialState = Promise.withResolvers();
  loadingStage = LoadingStage.NOT_LOADING;
  loadingStageStartTimestampMs;
  panelStateKind = PanelStateKind.kHidden;
  clientLoadErrorReason;
  clientLoadErrorReported = false;
  state;
  clientLoadFailed;
  earliestLoadingDismissTime;
  browserProxy;
  constructor(browserProxy) {
    this.browserProxy = browserProxy;
    window.addEventListener("online", () => {
      this.online();
    });
    window.addEventListener("offline", () => {
      if (!this.isOnline()) {
        this.offline();
      }
    });
    window.addEventListener("focus", () => {
      const isGuestVisible = !$.guestPanel.hidden;
      const isFocusTrapped =
        document.activeElement === document.body || !document.activeElement;
      if (isGuestVisible && isFocusTrapped) {
        this.webview?.focus();
      }
    });
    if (this.isOnline()) {
      this.setState(WebUiState.kBeginLoad);
    } else {
      this.setState(WebUiState.kOffline);
    }
    $.profilePickerButton.addEventListener("click", () => {
      this.openProfilePicker();
    });
    $.reload.addEventListener("click", () => {
      this.reload();
    });
    $.disabledByAdminCloseButton.addEventListener("click", () => {
      this.browserProxy.pageHandler.closePanel();
    });
    $.disabledByAdminPanel.querySelector("a")?.addEventListener("click", () => {
      this.openDisabledByAdminLink();
    });
    $.locationMismatchHelpButton.addEventListener("click", () => {
      this.browserProxy.pageHandler.openHelpCenterTopicAndClosePanel(
        HelpCenterTopic.kLocationMismatch,
      );
    });
    $.ineligibleAccountHelpButton.addEventListener("click", () => {
      this.browserProxy.pageHandler.openHelpCenterTopicAndClosePanel(
        HelpCenterTopic.kIneligibleAccount,
      );
    });
    $.signInButton.addEventListener("click", () => {
      this.signIn();
    });
    $.showError.addEventListener("click", () => {
      this.showPanel("guestPanel");
    });
    this.browserProxy.preloadPageCallbackRouter.onGuestNavigationStarted.addListener(
      () => {
        this.onGuestNavigationStarted();
      },
    );
    this.browserProxy.preloadPageCallbackRouter.onGuestNavigated.addListener(
      (url, isApiAllowed, pageType, isInitialCommit) => {
        this.onGuestNavigated(url, isApiAllowed, pageType, isInitialCommit);
      },
    );
    this.browserProxy.preloadPageCallbackRouter.onGuestProcessGone.addListener(
      () => {
        this.webviewError("guest process gone");
      },
    );
    if (kShowErrorAllowed) {
      $.showError.hidden = false;
    }
    document.addEventListener("keydown", (ev) => {
      if (this.state !== WebUiState.kReady) {
        if (ev.code === "Escape") {
          ev.stopPropagation();
          ev.preventDefault();
          this.browserProxy.pageHandler.closePanel();
        }
      }
    });
    this.initializeIcons_();
  }
  webviewError(reason) {
    console.warn(`webview exit. reason: ${reason}`);
    this.setErrorState(
      WebUiErrorReason.WEBVIEW_ERROR,
      ClientLoadErrorReason.kGuestProcessGone,
    );
  }
  onGuestNavigationStarted() {
    this.webview?.onGuestNavigationStarted();
  }
  onGuestNavigated(url, isApiAllowed, pageType, isInitialCommit) {
    this.webview?.onGuestNavigated(
      url,
      isApiAllowed,
      pageType,
      isInitialCommit,
    );
  }
  webviewPageCommit(type, _isApiAllowed) {
    switch (type) {
      case GuestPageType.kLogin:
        this.cancelTimeout();
        $.guestPanel.classList.toggle("show-header", true);
        this.showPanel("guestPanel");
        break;
      case GuestPageType.kGuestError:
        this.setState(WebUiState.kGuestError);
        break;
      case GuestPageType.kRegular:
        $.guestPanel.classList.toggle("show-header", false);
        if (loadTimeData.getBoolean("reloadAfterNavigation")) {
          if (
            this.state === WebUiState.kReady ||
            this.state === WebUiState.kWarmed ||
            this.state === WebUiState.kGuestError
          ) {
            this.setState(WebUiState.kBeginLoad);
          }
        }
        break;
      case GuestPageType.kLoadError:
        this.setErrorState(
          WebUiErrorReason.LOAD_ERROR,
          ClientLoadErrorReason.kGuestLoadFailed,
        );
        break;
      case GuestPageType.kDisabledByAdmin:
        this.webviewDeniedByAdmin();
        break;
      default:
        assertNotReachedCase$1();
    }
  }
  webviewDeniedByAdmin() {
    $.disabledByAdminPanel.classList.toggle(
      "show-disabled-by-admin-link",
      true,
    );
    this.setState(WebUiState.kDisabledByAdmin);
  }
  setState(newState, clientLoadErrorReason) {
    if (this.state === newState) {
      return;
    }
    if (this.state) {
      this.states.get(this.state).onExit?.call(this);
    }
    this.state = newState;
    const descriptor = this.states.get(this.state);
    descriptor.onEnter?.call(this);
    this.browserProxy.pageHandler.onWebUiStateChanged(this.state);
    if (clientLoadErrorReason === undefined) {
      this.clientLoadErrorReason = descriptor.clientLoadErrorReason;
    } else {
      this.clientLoadErrorReason =
        clientLoadErrorReason === null ? undefined : clientLoadErrorReason;
    }
    this.clientLoadErrorReported = false;
    this.maybeReportClientLoadError();
    const failed = this.hasClientLoadFailed(this.state);
    if (this.clientLoadFailed !== failed) {
      this.clientLoadFailed = failed;
      this.browserProxy.pageHandler.onClientLoadFailed(failed);
    }
  }
  hasClientLoadFailed(state) {
    switch (state) {
      case WebUiState.kUninitialized:
      case WebUiState.kBeginLoad:
      case WebUiState.kShowLoading:
      case WebUiState.kHoldLoading:
      case WebUiState.kFinishLoading:
      case WebUiState.kReady:
      case WebUiState.kWarmed:
      case WebUiState.kUnresponsive:
        return false;
      case WebUiState.kError:
      case WebUiState.kOffline:
      case WebUiState.kUnavailable:
      case WebUiState.kSignIn:
      case WebUiState.kGuestError:
      case WebUiState.kDisabledByAdmin:
      case WebUiState.kLocationMismatch:
      case WebUiState.kIneligibleAccount:
        return true;
      default:
        assertNotReachedCase$1();
    }
  }
  maybeReportClientLoadError() {
    if (
      this.clientLoadErrorReason === undefined ||
      this.clientLoadErrorReported ||
      this.panelStateKind === PanelStateKind.kHidden
    ) {
      return;
    }
    this.clientLoadErrorReported = true;
    this.browserProxy.pageHandler.notifyClientLoadError(
      this.clientLoadErrorReason,
    );
  }
  setErrorState(reason, clientLoadErrorReason) {
    if (this.state === WebUiState.kError) {
      return;
    }
    chrome.histograms.recordEnumerationValue(
      "Glic.PanelWebUiState.Error",
      reason,
      WebUiErrorReason.MAX_VALUE + 1,
    );
    if (!this.isFreCompleted) {
      chrome.histograms.recordEnumerationValue(
        "Glic.Fre.PanelWebUiState.Error",
        reason,
        WebUiErrorReason.MAX_VALUE + 1,
      );
    }
    this.setState(WebUiState.kError, clientLoadErrorReason);
  }
  stateDescriptor() {
    return this.state !== undefined ? this.states.get(this.state) : undefined;
  }
  states = new Map([
    [
      WebUiState.kBeginLoad,
      { onEnter: this.beginLoad, onExit: this.cancelTimeout },
    ],
    [
      WebUiState.kShowLoading,
      { onEnter: this.showLoading, onExit: this.cancelTimeout },
    ],
    [
      WebUiState.kHoldLoading,
      { onEnter: this.holdLoading, onExit: this.cancelTimeout },
    ],
    [
      WebUiState.kFinishLoading,
      { onEnter: this.finishLoading, onExit: this.cancelTimeout },
    ],
    [
      WebUiState.kError,
      {
        reloadOnOpen: true,
        onEnter: () => {
          this.destroyWebview();
          this.showPanel("errorPanel");
        },
      },
    ],
    [
      WebUiState.kOffline,
      {
        clientLoadErrorReason: ClientLoadErrorReason.kOffline,
        onEnter: () => {
          this.destroyWebview();
          this.showPanel("offlinePanel");
        },
      },
    ],
    [
      WebUiState.kUnavailable,
      {
        clientLoadErrorReason: ClientLoadErrorReason.kUnavailable,
        reloadOnOpen: true,
        onEnter: () => {
          this.destroyWebview();
          this.showPanel("unavailablePanel");
        },
      },
    ],
    [
      WebUiState.kIneligibleAccount,
      {
        clientLoadErrorReason: ClientLoadErrorReason.kIneligibleAccount,
        reloadOnOpen: true,
        onEnter: () => {
          this.destroyWebview();
          this.showPanel("ineligibleAccountPanel");
        },
      },
    ],
    [
      WebUiState.kDisabledByAdmin,
      {
        clientLoadErrorReason: ClientLoadErrorReason.kDisabledByAdmin,
        reloadOnOpen: true,
        onEnter: () => {
          this.destroyWebview();
          this.showPanel("disabledByAdminPanel");
        },
      },
    ],
    [
      WebUiState.kLocationMismatch,
      {
        clientLoadErrorReason: ClientLoadErrorReason.kLocationMismatch,
        reloadOnOpen: true,
        onEnter: () => {
          this.destroyWebview();
          this.showPanel("locationMismatchPanel");
        },
      },
    ],
    [
      WebUiState.kWarmed,
      {
        onEnter: () => {
          $.guestPanel.classList.toggle("show-header", false);
          this.showPanel("guestPanel");
        },
      },
    ],
    [
      WebUiState.kReady,
      {
        onEnter: () => {
          this.trackLoadingStageEnd();
          $.guestPanel.classList.toggle("show-header", false);
          this.showPanel("guestPanel");
        },
      },
    ],
    [
      WebUiState.kUnresponsive,
      {
        reloadOnOpen: true,
        onEnter: () => {
          $.unresponsiveOverlay.classList.toggle("hidden", false);
        },
        onExit: () => {
          $.unresponsiveOverlay.classList.toggle("hidden", true);
        },
      },
    ],
    [
      WebUiState.kSignIn,
      {
        clientLoadErrorReason: ClientLoadErrorReason.kSignIn,
        reloadOnOpen: true,
        onEnter: () => {
          this.destroyWebview();
          this.showPanel("signInPanel");
        },
      },
    ],
    [
      WebUiState.kGuestError,
      {
        reloadOnOpen: true,
        onEnter: () => {
          $.guestPanel.classList.toggle("show-header", true);
          this.showPanel("guestPanel");
        },
      },
    ],
  ]);
  cancelTimeout() {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = undefined;
    }
  }
  beginLoad() {
    if (!loadTimeData.getBoolean("noLoader")) {
      this.loadingTimer = setTimeout(() => {
        if (
          this.state === WebUiState.kWarmed ||
          this.state === WebUiState.kReady
        ) {
          return;
        }
        this.setState(WebUiState.kShowLoading);
      }, kPreHoldLoadingTimeMs);
    }
    this.load();
  }
  trackLoadingStageStart(newStage) {
    this.loadingStage = newStage;
    this.loadingStageStartTimestampMs = performance.now();
  }
  trackLoadingStageEnd() {
    if (this.loadingStage === LoadingStage.NOT_LOADING) {
      return;
    }
    chrome.histograms.recordMediumTime(
      "Glic.Host.LoadingStageDuration." + LoadingStage[this.getLoadingStage()],
      Math.floor(performance.now() - this.loadingStageStartTimestampMs),
    );
    this.loadingStage = LoadingStage.NOT_LOADING;
  }
  getLoadingStage() {
    return this.loadingStage;
  }
  async load() {
    this.destroyWebview();
    this.trackLoadingStageStart(LoadingStage.AWAITING_PROFILE_READY);
    await this.profileReadyInitialState.promise;
    this.trackLoadingStageEnd();
    const readyState = this.profileReadyState;
    assert(readyState !== undefined);
    switch (readyState) {
      case ProfileReadyState.kIneligible:
      case ProfileReadyState.kUnknownError:
        this.setState(WebUiState.kUnavailable);
        return;
      case ProfileReadyState.kIneligibleAccount:
        this.setState(WebUiState.kIneligibleAccount);
        return;
      case ProfileReadyState.kLocationMismatch:
        this.setState(WebUiState.kLocationMismatch);
        return;
      case ProfileReadyState.kDisabledByAdmin:
        $.disabledByAdminPanel.classList.toggle(
          "show-disabled-by-admin-link",
          false,
        );
        this.setState(WebUiState.kDisabledByAdmin);
        return;
      case ProfileReadyState.kSignInRequired:
        this.setState(WebUiState.kSignIn);
        return;
      case ProfileReadyState.kReady:
        break;
      default:
        assertNotReachedCase$1();
    }
    this.trackLoadingStageStart(LoadingStage.AWAITING_COOKIE_SYNC);
    const { result: result } = this.browserProxy.glicPreloadHandler
      ? await this.browserProxy.glicPreloadHandler.prepareForClient()
      : await this.browserProxy.pageHandler.prepareForClient();
    this.trackLoadingStageEnd();
    switch (result) {
      case PrepareForClientResult.kSuccess:
        break;
      case PrepareForClientResult.kErrorResyncingCookies:
        console.warn("prepareForClient in beginLoad() failed.");
        this.setErrorState(
          WebUiErrorReason.COOKIE_SYNC_ERROR,
          ClientLoadErrorReason.kCookieSyncFailed,
        );
        return;
      case PrepareForClientResult.kRequiresSignIn:
        this.setState(WebUiState.kSignIn);
        return;
      default:
        assertNotReachedCase$1();
    }
    this.trackLoadingStageStart(LoadingStage.LOADING_WEB_CLIENT);
    this.webview = new WebviewController(
      $.webviewContainer,
      this.browserProxy,
      this,
      this.webviewPersistentState,
    );
    this.webview
      .getWebClientState()
      .subscribe(this.webClientStateChanged.bind(this));
    if (loadTimeData.getBoolean("noLoader")) {
      this.showPanel("guestPanel");
    }
  }
  showLoading() {
    if (this.state === WebUiState.kWarmed) {
      return;
    }
    this.showPanel("loadingPanel");
    this.earliestLoadingDismissTime = performance.now() + kMinHoldLoadingTimeMs;
    if (
      this.webview?.getWebClientState().getCurrentValue() ===
      WebClientState.kResponsive
    ) {
      if (this.panelStateKind === PanelStateKind.kHidden) {
        this.setState(WebUiState.kWarmed);
        return;
      }
      this.setState(WebUiState.kHoldLoading);
      return;
    }
    this.earliestLoadingDismissTime = performance.now() + kMinHoldLoadingTimeMs;
    this.loadingTimer = setTimeout(() => {
      if (
        this.state === WebUiState.kWarmed ||
        this.state === WebUiState.kReady
      ) {
        return;
      }
      this.setState(WebUiState.kFinishLoading);
    }, kMinHoldLoadingTimeMs);
  }
  holdLoading() {
    this.loadingTimer = setTimeout(
      () => {
        this.setState(WebUiState.kReady);
      },
      Math.max(0, this.earliestLoadingDismissTime - performance.now()),
    );
  }
  finishLoading() {
    if (this.state === WebUiState.kWarmed) {
      return;
    }
    if (this.panelStateKind === PanelStateKind.kHidden) {
      this.cancelTimeout();
      this.trackLoadingStageEnd();
      this.setState(WebUiState.kWarmed);
      return;
    }
    this.loadingTimer = setTimeout(() => {
      console.warn("Exceeded timeout waiting for client to load");
      this.setErrorState(
        WebUiErrorReason.TIMEOUT_LOADING_CLIENT,
        ClientLoadErrorReason.kClientLoadTimeout,
      );
      if (this.state !== WebUiState.kReady) {
        chrome.histograms.recordEnumerationValue(
          "Glic.Host.LoadingTimedOut",
          this.getLoadingStage(),
          LoadingStage.MAX_VALUE + 1,
        );
      }
      this.trackLoadingStageEnd();
    }, kMaxWaitTimeMs - kMinHoldLoadingTimeMs);
  }
  showPanel(id) {
    for (const panel of document.querySelectorAll(".panel")) {
      panel.hidden = panel.id !== id;
    }
    const panelStateKindSection = getRequiredElement("localPanels");
    panelStateKindSection.classList.toggle("hidden", id === "guestPanel");
    if (id === "guestPanel") {
      this.webview?.focus();
    }
  }
  destroyWebview() {
    if (!this.webview) {
      return;
    }
    this.webview.destroy();
    this.webview = undefined;
  }
  online() {
    if (this.simulateNoConnection) {
      return;
    }
    if (this.state !== WebUiState.kOffline) {
      return;
    }
    this.setState(WebUiState.kBeginLoad);
  }
  offline() {
    const allowedStates = [
      WebUiState.kBeginLoad,
      WebUiState.kShowLoading,
      WebUiState.kFinishLoading,
    ];
    if (allowedStates.includes(this.state)) {
      this.setState(WebUiState.kOffline);
    }
  }
  startWarmedTimeout() {
    this.cancelTimeout();
    if (this.panelStateKind === PanelStateKind.kHidden) {
      return;
    }
    this.loadingTimer = setTimeout(() => {
      if (this.state === WebUiState.kWarmed) {
        this.setErrorState(
          WebUiErrorReason.TIMEOUT_WARMED,
          ClientLoadErrorReason.kWarmedTimeout,
        );
      }
    }, kMaxWaitTimeMs);
  }
  webClientStateChanged(state) {
    switch (state) {
      case WebClientState.kUninitialized:
        break;
      case WebClientState.kWarmed:
        if (
          this.state === WebUiState.kBeginLoad ||
          this.state === WebUiState.kFinishLoading ||
          this.state === WebUiState.kShowLoading
        ) {
          this.cancelTimeout();
          this.setState(WebUiState.kWarmed);
          if (this.panelStateKind !== PanelStateKind.kHidden) {
            this.startWarmedTimeout();
          }
        }
        break;
      case WebClientState.kResponsive:
        if (this.state === WebUiState.kUnresponsive) {
          this.setState(WebUiState.kReady);
        }
        break;
      case WebClientState.kUnresponsive:
        break;
      case WebClientState.kError:
        this.setErrorState(
          WebUiErrorReason.CLIENT_ERROR,
          ClientLoadErrorReason.kClientError,
        );
        break;
      default:
        assertNotReachedCase$1();
    }
  }
  close() {
    if (this.state === WebUiState.kReady) {
      this.browserProxy.pageHandler.closePanel();
    } else {
      this.browserProxy.pageHandler.closePanel().then(() => {
        this.reload();
      });
    }
  }
  reload() {
    this.destroyWebview();
    this.setState(WebUiState.kBeginLoad);
  }
  openProfilePicker() {
    this.browserProxy.pageHandler.openProfilePickerAndClosePanel();
  }
  signIn() {
    this.browserProxy.pageHandler.signInAndClosePanel();
  }
  clientReadyStateChanged(ready) {
    if (!ready) {
      return;
    }
    if (
      this.state === WebUiState.kBeginLoad ||
      this.state === WebUiState.kFinishLoading ||
      this.state === WebUiState.kWarmed
    ) {
      this.cancelTimeout();
      this.trackLoadingStageEnd();
      this.setState(WebUiState.kReady);
    } else if (this.state === WebUiState.kShowLoading) {
      this.cancelTimeout();
      this.setState(WebUiState.kHoldLoading);
    } else if (this.state !== WebUiState.kHoldLoading) {
      this.setState(WebUiState.kReady);
    }
  }
  updatePageState(panelStateKind) {
    if (this.panelStateKind === panelStateKind) {
      return;
    }
    this.panelStateKind = panelStateKind;
    this.maybeReportClientLoadError();
    if (
      this.panelStateKind !== PanelStateKind.kHidden &&
      this.state === WebUiState.kWarmed
    ) {
      this.startWarmedTimeout();
    }
    const panelStateKindSection = getRequiredElement("localPanels");
    panelStateKindSection.classList.toggle(
      "sidePanel",
      this.panelStateKind === PanelStateKind.kAttached,
    );
    panelStateKindSection.classList.toggle(
      "floating",
      this.panelStateKind === PanelStateKind.kDetached,
    );
  }
  zoom(zoomAction) {
    this.webview?.zoom(zoomAction);
  }
  intentToShow() {
    if (this.stateDescriptor()?.reloadOnOpen) {
      this.reload();
    }
  }
  setProfileReadyState(state) {
    if (this.profileReadyState === state) {
      return;
    }
    const initialCall = this.profileReadyState === undefined;
    this.profileReadyState = state;
    if (initialCall) {
      this.profileReadyInitialState.resolve();
    } else {
      switch (this.profileReadyState) {
        case ProfileReadyState.kUnknownError:
        case ProfileReadyState.kIneligible:
          this.setState(WebUiState.kUnavailable);
          break;
        case ProfileReadyState.kIneligibleAccount:
          this.setState(WebUiState.kIneligibleAccount);
          break;
        case ProfileReadyState.kLocationMismatch:
          this.setState(WebUiState.kLocationMismatch);
          break;
        case ProfileReadyState.kDisabledByAdmin:
          $.disabledByAdminPanel.classList.toggle(
            "show-disabled-by-admin-link",
            false,
          );
          this.setState(WebUiState.kDisabledByAdmin);
          break;
        case ProfileReadyState.kSignInRequired:
          this.setState(WebUiState.kSignIn);
          break;
        case ProfileReadyState.kReady:
          if (this.stateDescriptor()?.reloadOnOpen) {
            this.setState(WebUiState.kBeginLoad);
          }
          break;
        default:
          assertNotReachedCase$1(this.profileReadyState);
      }
    }
  }
  openDisabledByAdminLink() {
    this.browserProxy.pageHandler.openDisabledByAdminLinkAndClosePanel();
  }
  isOnline() {
    return loadTimeData.getBoolean("ignoreOfflineState")
      ? true
      : navigator.onLine && !this.simulateNoConnection;
  }
  initializeIcons_() {
    const isRounded = loadTimeData.getBoolean("webuiRoundedIconsEnabled");
    const updateIcon = (panel, roundedIcon, oldIcon) => {
      const el = panel.querySelector("cr-icon");
      if (el) {
        el.setAttribute("icon", isRounded ? roundedIcon : oldIcon);
      }
    };
    updateIcon($.offlinePanel, "glic:wifi-off", "glic:offline-old");
    updateIcon($.errorPanel, "glic:error", "glic:error-old");
    updateIcon(
      $.unavailablePanel,
      "glic:person-alert",
      "glic:person-alert-old",
    );
    updateIcon(
      $.ineligibleAccountPanel,
      "glic:do-not-touch",
      "glic:ineligible-account-old",
    );
    updateIcon($.signInPanel, "glic:person-alert", "glic:person-alert-old");
    updateIcon(
      $.locationMismatchPanel,
      "glic:location-on",
      "glic:location-mismatch-old",
    );
  }
}
var AppView;
(function (AppView) {
  AppView[(AppView["GLIC"] = 0)] = "GLIC";
})(AppView || (AppView = {}));
class AppRouter {
  glicController;
  glicContainer;
  browserProxy;
  currentView;
  currentPanelStateKind;
  instanceId;
  constructor() {
    this.glicContainer = getRequiredElement("glic-app-container");
    this.browserProxy = new BrowserProxyImpl();
    this.browserProxy.pageCallbackRouter.intentToShow.addListener(
      this.intentToShow_.bind(this),
    );
    this.browserProxy.pageCallbackRouter.updatePageState.addListener(
      this.updatePageState_.bind(this),
    );
    this.browserProxy.pageCallbackRouter.zoom.addListener(
      this.zoom_.bind(this),
    );
    this.browserProxy.instanceId.subscribe(this.setInstanceId_.bind(this));
    this.browserProxy.pageCallbackRouter.setProfileReadyState.addListener(
      this.setProfileReadyState_.bind(this),
    );
    this.browserProxy.preloadPageCallbackRouter.setProfileReadyState.addListener(
      this.setProfileReadyState_.bind(this),
    );
    this.browserProxy.pageCallbackRouter.clientReadyStateChanged.addListener(
      this.clientReadyStateChanged_.bind(this),
    );
    this.switchToView(AppView.GLIC);
  }
  clientReadyStateChanged_(ready) {
    this.glicController?.clientReadyStateChanged(ready);
  }
  switchToView(view) {
    if (this.currentView === view) {
      return;
    }
    this.glicContainer.hidden = true;
    this.currentView = view;
    switch (this.currentView) {
      case AppView.GLIC:
        if (!this.glicController) {
          this.glicController = new GlicAppController(this.browserProxy);
          if (this.currentPanelStateKind !== undefined) {
            this.glicController.updatePageState(this.currentPanelStateKind);
          }
        }
        this.glicContainer.hidden = false;
        break;
      default:
        assertNotReachedCase$1(this.currentView);
    }
  }
  intentToShow_() {
    this.glicController?.intentToShow();
  }
  setProfileReadyState_(state) {
    this.glicController?.setProfileReadyState(state);
  }
  updatePageState_(panelStateKind) {
    this.currentPanelStateKind = panelStateKind;
    this.glicController?.updatePageState(panelStateKind);
    this.updateUrl_();
  }
  setInstanceId_(instanceId) {
    this.instanceId = instanceId;
    this.updateUrl_();
  }
  updateUrl_() {
    try {
      const url = new URL(window.location.href);
      if (this.instanceId) {
        url.searchParams.set("instance", this.instanceId);
      }
      if (this.currentPanelStateKind !== undefined) {
        url.searchParams.set(
          "state",
          this.currentPanelStateKind !== PanelStateKind.kHidden
            ? "Open"
            : "Closed",
        );
      }
      window.history.replaceState({}, "", url.toString());
    } catch (e) {}
  }
  zoom_(zoomAction) {
    this.glicController?.zoom(zoomAction);
  }
  close() {
    this.browserProxy.pageHandler.closePanel();
  }
  reload() {
    this.glicController?.reload();
  }
}
function setupListeners(controller) {
  const buttons = document.querySelectorAll(".close-button");
  for (const button of buttons) {
    button.addEventListener("click", () => {
      controller.close();
    });
  }
  const retryButton = document.getElementById("retry");
  if (retryButton) {
    retryButton.addEventListener("click", () => {});
  }
  const reloadButton = document.getElementById("reload");
  if (reloadButton) {
    reloadButton.addEventListener("click", () => {
      if ("reload" in controller) {
        controller.reload();
      }
    });
  }
}
window.addEventListener("DOMContentLoaded", () => {
  if (loadTimeData.getBoolean("isAndroidMobile")) {
    document.body.classList.add("androidMobile");
  }
  ColorChangeUpdater.forDocument().start();
  const appRouter = new AppRouter();
  window.appRouter = appRouter;
  setupListeners(appRouter);
});
export {
  GuestPageType,
  ObservableValue,
  PageCallbackRouter,
  PreloadPageCallbackRouter,
  Subject,
  WebviewController,
  WebviewPersistentState,
  ZoomAction,
};
