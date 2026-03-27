import {
  MAT_INPUT_VALUE_ACCESSOR
} from "./chunk-AVO3A37G.js";
import {
  DateAdapter,
  MAT_DATE_FORMATS
} from "./chunk-74HTOQP2.js";
import {
  MAT_OPTION_PARENT_COMPONENT,
  MatOption
} from "./chunk-6QWER5SI.js";
import {
  createFlexibleConnectedPositionStrategy,
  createOverlayRef,
  createRepositionScrollStrategy
} from "./chunk-G5B6F3QR.js";
import {
  TemplatePortal
} from "./chunk-MZ2QDMBJ.js";
import {
  MAT_FORM_FIELD
} from "./chunk-6QOJNRNX.js";
import "./chunk-KVX77FV4.js";
import {
  MatIconButton
} from "./chunk-2GPBDWW5.js";
import "./chunk-SWFBRTOJ.js";
import "./chunk-CRUSZOHO.js";
import {
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  Validators
} from "./chunk-6JUSCCVW.js";
import "./chunk-QZCEYIUZ.js";
import "./chunk-5Q2AWEVC.js";
import "./chunk-CUWULZ5D.js";
import "./chunk-VON75VBJ.js";
import "./chunk-PLJ2QXBA.js";
import {
  _animationsDisabled
} from "./chunk-O3355VI2.js";
import {
  ActiveDescendantKeyManager
} from "./chunk-3OQHSF2P.js";
import "./chunk-3EQIYMO2.js";
import "./chunk-CHE77QFE.js";
import "./chunk-2WXB7TIV.js";
import "./chunk-CRQFBJ6F.js";
import "./chunk-VRCLUFZA.js";
import {
  DOWN_ARROW,
  ENTER,
  ESCAPE,
  TAB,
  UP_ARROW,
  hasModifierKey
} from "./chunk-GQDNQF7P.js";
import "./chunk-6T7QHXSD.js";
import "./chunk-DLJF5AV5.js";
import {
  _IdGenerator
} from "./chunk-FQIMBXDW.js";
import {
  _getEventTarget,
  _getFocusedElementPierceShadowDom
} from "./chunk-EE4Q3I4S.js";
import "./chunk-MV2NGOTN.js";
import "./chunk-N4DOILP3.js";
import {
  CdkScrollableModule
} from "./chunk-FAERQWMR.js";
import "./chunk-BBOZITVB.js";
import "./chunk-GUGIMSVJ.js";
import {
  Directionality
} from "./chunk-EKTVZ2II.js";
import "./chunk-KFOSV5VH.js";
import "./chunk-CXH2GZ4H.js";
import "./chunk-KJUFFDJ3.js";
import "./chunk-QSH7A4MU.js";
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  HostAttributeToken,
  InjectionToken,
  Injector,
  Input,
  NgModule,
  Output,
  Renderer2,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  output,
  setClassMetadata,
  signal,
  untracked,
  viewChild,
  viewChildren,
  ɵɵProvidersFeature,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵdefineDirective,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdomProperty,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵproperty,
  ɵɵqueryAdvance,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵviewQuerySignal
} from "./chunk-EOTFVC7M.js";
import "./chunk-HWYXSU2G.js";
import "./chunk-JRFR6BLO.js";
import "./chunk-MARUHEWW.js";
import {
  __spreadProps,
  __spreadValues
} from "./chunk-3OV72XIM.js";

// node_modules/@angular/material/fesm2022/timepicker.mjs
var _c0 = ["panelTemplate"];
var _forTrack0 = ($index, $item) => $item.value;
function MatTimepicker_ng_template_0_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "mat-option", 3);
    ɵɵlistener("onSelectionChange", function MatTimepicker_ng_template_0_For_2_Template_mat_option_onSelectionChange_0_listener($event) {
      ɵɵrestoreView(_r3);
      const ctx_r1 = ɵɵnextContext(2);
      return ɵɵresetView(ctx_r1._selectValue($event.source));
    });
    ɵɵtext(1);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const option_r4 = ctx.$implicit;
    ɵɵproperty("value", option_r4.value);
    ɵɵadvance();
    ɵɵtextInterpolate(option_r4.label);
  }
}
function MatTimepicker_ng_template_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = ɵɵgetCurrentView();
    ɵɵelementStart(0, "div", 1);
    ɵɵlistener("animationend", function MatTimepicker_ng_template_0_Template_div_animationend_0_listener($event) {
      ɵɵrestoreView(_r1);
      const ctx_r1 = ɵɵnextContext();
      return ɵɵresetView(ctx_r1._handleAnimationEnd($event));
    });
    ɵɵrepeaterCreate(1, MatTimepicker_ng_template_0_For_2_Template, 2, 2, "mat-option", 2, _forTrack0);
    ɵɵelementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = ɵɵnextContext();
    ɵɵclassProp("mat-timepicker-panel-animations-enabled", !ctx_r1._animationsDisabled)("mat-timepicker-panel-exit", !ctx_r1.isOpen());
    ɵɵproperty("id", ctx_r1.panelId);
    ɵɵattribute("aria-label", ctx_r1.ariaLabel() || null)("aria-labelledby", ctx_r1._getAriaLabelledby());
    ɵɵadvance();
    ɵɵrepeater(ctx_r1._timeOptions);
  }
}
var _c1 = [[["", "matTimepickerToggleIcon", ""]]];
var _c2 = ["[matTimepickerToggleIcon]"];
function MatTimepickerToggle_ProjectionFallback_1_Template(rf, ctx) {
  if (rf & 1) {
    ɵɵnamespaceSVG();
    ɵɵelementStart(0, "svg", 1);
    ɵɵelement(1, "path", 2);
    ɵɵelementEnd();
  }
}
var INTERVAL_PATTERN = /^(\d*\.?\d+)\s*(h|hour|hours|m|min|minute|minutes|s|second|seconds)?$/i;
var MAT_TIMEPICKER_CONFIG = new InjectionToken("MAT_TIMEPICKER_CONFIG");
function parseInterval(value) {
  let result;
  if (value === null) {
    return null;
  } else if (typeof value === "number") {
    result = value;
  } else {
    if (value.trim().length === 0) {
      return null;
    }
    const parsed = value.match(INTERVAL_PATTERN);
    const amount = parsed ? parseFloat(parsed[1]) : null;
    const unit = parsed?.[2]?.toLowerCase() || null;
    if (!parsed || amount === null || isNaN(amount)) {
      return null;
    }
    if (unit === "h" || unit === "hour" || unit === "hours") {
      result = amount * 3600;
    } else if (unit === "m" || unit === "min" || unit === "minute" || unit === "minutes") {
      result = amount * 60;
    } else {
      result = amount;
    }
  }
  return result;
}
function generateOptions(adapter, formats, min, max, interval) {
  const options = [];
  let current = adapter.compareTime(min, max) < 1 ? min : max;
  while (adapter.sameDate(current, min) && adapter.compareTime(current, max) < 1 && adapter.isValid(current)) {
    options.push({
      value: current,
      label: adapter.format(current, formats.display.timeOptionLabel)
    });
    current = adapter.addSeconds(current, interval);
  }
  return options;
}
function validateAdapter(adapter, formats) {
  function missingAdapterError(provider) {
    return Error(`MatTimepicker: No provider found for ${provider}. You must add one of the following to your app config: provideNativeDateAdapter, provideDateFnsAdapter, provideLuxonDateAdapter, provideMomentDateAdapter, or provide a custom implementation.`);
  }
  if (!adapter) {
    throw missingAdapterError("DateAdapter");
  }
  if (!formats) {
    throw missingAdapterError("MAT_DATE_FORMATS");
  }
  if (formats.display.timeInput === void 0 || formats.display.timeOptionLabel === void 0 || formats.parse.timeInput === void 0) {
    throw new Error("MatTimepicker: Incomplete `MAT_DATE_FORMATS` has been provided. `MAT_DATE_FORMATS` must provide `display.timeInput`, `display.timeOptionLabel` and `parse.timeInput` formats in order to be compatible with MatTimepicker.");
  }
}
var MAT_TIMEPICKER_SCROLL_STRATEGY = new InjectionToken("MAT_TIMEPICKER_SCROLL_STRATEGY", {
  providedIn: "root",
  factory: () => {
    const injector = inject(Injector);
    return () => createRepositionScrollStrategy(injector);
  }
});
var MatTimepicker = class _MatTimepicker {
  _dir = inject(Directionality, {
    optional: true
  });
  _viewContainerRef = inject(ViewContainerRef);
  _injector = inject(Injector);
  _defaultConfig = inject(MAT_TIMEPICKER_CONFIG, {
    optional: true
  });
  _dateAdapter = inject(DateAdapter, {
    optional: true
  });
  _dateFormats = inject(MAT_DATE_FORMATS, {
    optional: true
  });
  _scrollStrategyFactory = inject(MAT_TIMEPICKER_SCROLL_STRATEGY);
  _animationsDisabled = _animationsDisabled();
  _isOpen = signal(false, ...ngDevMode ? [{
    debugName: "_isOpen"
  }] : []);
  _activeDescendant = signal(null, ...ngDevMode ? [{
    debugName: "_activeDescendant"
  }] : []);
  _input = signal(null, ...ngDevMode ? [{
    debugName: "_input"
  }] : []);
  _overlayRef = null;
  _portal = null;
  _optionsCacheKey = null;
  _localeChanges;
  _onOpenRender = null;
  _panelTemplate = viewChild.required("panelTemplate");
  _timeOptions = [];
  _options = viewChildren(MatOption, ...ngDevMode ? [{
    debugName: "_options"
  }] : []);
  _keyManager = new ActiveDescendantKeyManager(this._options, this._injector).withHomeAndEnd(true).withPageUpDown(true).withVerticalOrientation(true);
  interval = input(parseInterval(this._defaultConfig?.interval || null), __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "interval"
  } : {}), {
    transform: parseInterval
  }));
  options = input(null, ...ngDevMode ? [{
    debugName: "options"
  }] : []);
  isOpen = this._isOpen.asReadonly();
  selected = output();
  opened = output();
  closed = output();
  activeDescendant = this._activeDescendant.asReadonly();
  panelId = inject(_IdGenerator).getId("mat-timepicker-panel-");
  disableRipple = input(this._defaultConfig?.disableRipple ?? false, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "disableRipple"
  } : {}), {
    transform: booleanAttribute
  }));
  ariaLabel = input(null, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "ariaLabel"
  } : {}), {
    alias: "aria-label"
  }));
  ariaLabelledby = input(null, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "ariaLabelledby"
  } : {}), {
    alias: "aria-labelledby"
  }));
  disabled = computed(() => !!this._input()?.disabled(), ...ngDevMode ? [{
    debugName: "disabled"
  }] : []);
  panelClass = input(...ngDevMode ? [void 0, {
    debugName: "panelClass"
  }] : []);
  constructor() {
    if (typeof ngDevMode === "undefined" || ngDevMode) {
      validateAdapter(this._dateAdapter, this._dateFormats);
      effect(() => {
        const options = this.options();
        const interval = this.interval();
        if (options !== null && interval !== null) {
          throw new Error("Cannot specify both the `options` and `interval` inputs at the same time");
        } else if (options?.length === 0) {
          throw new Error("Value of `options` input cannot be an empty array");
        }
      });
    }
    const element = inject(ElementRef);
    element.nativeElement.setAttribute("mat-timepicker-panel-id", this.panelId);
    this._handleLocaleChanges();
    this._handleInputStateChanges();
    this._keyManager.change.subscribe(() => this._activeDescendant.set(this._keyManager.activeItem?.id || null));
  }
  open() {
    const input2 = this._input();
    if (!input2) {
      return;
    }
    input2.focus();
    if (this._isOpen()) {
      return;
    }
    this._isOpen.set(true);
    this._generateOptions();
    const overlayRef = this._getOverlayRef();
    overlayRef.updateSize({
      width: input2.getOverlayOrigin().nativeElement.offsetWidth
    });
    this._portal ??= new TemplatePortal(this._panelTemplate(), this._viewContainerRef);
    if (!overlayRef.hasAttached()) {
      overlayRef.attach(this._portal);
    }
    this._onOpenRender?.destroy();
    this._onOpenRender = afterNextRender(() => {
      const options = this._options();
      this._syncSelectedState(input2.value(), options, options[0]);
      this._onOpenRender = null;
    }, {
      injector: this._injector
    });
    this.opened.emit();
  }
  close() {
    if (this._isOpen()) {
      this._isOpen.set(false);
      this.closed.emit();
      if (this._animationsDisabled) {
        this._overlayRef?.detach();
      }
    }
  }
  registerInput(input2) {
    const currentInput = this._input();
    if (currentInput && input2 !== currentInput && (typeof ngDevMode === "undefined" || ngDevMode)) {
      throw new Error("MatTimepicker can only be registered with one input at a time");
    }
    this._input.set(input2);
  }
  ngOnDestroy() {
    this._keyManager.destroy();
    this._localeChanges?.unsubscribe();
    this._onOpenRender?.destroy();
    this._overlayRef?.dispose();
  }
  _getOverlayHost() {
    return this._overlayRef?.hostElement;
  }
  _selectValue(option) {
    this.close();
    this._keyManager.setActiveItem(option);
    this._options().forEach((current) => {
      if (current !== option) {
        current.deselect(false);
      }
    });
    this._input()?.timepickerValueAssigned(option.value);
    this.selected.emit({
      value: option.value,
      source: this
    });
    this._input()?.focus();
  }
  _getAriaLabelledby() {
    if (this.ariaLabel()) {
      return null;
    }
    return this.ariaLabelledby() || this._input()?.getLabelId() || null;
  }
  _handleAnimationEnd(event) {
    if (event.animationName === "_mat-timepicker-exit") {
      this._overlayRef?.detach();
    }
  }
  _getOverlayRef() {
    if (this._overlayRef) {
      return this._overlayRef;
    }
    const positionStrategy = createFlexibleConnectedPositionStrategy(this._injector, this._input().getOverlayOrigin()).withFlexibleDimensions(false).withPush(false).withTransformOriginOn(".mat-timepicker-panel").withPopoverLocation("inline").withPositions([{
      originX: "start",
      originY: "bottom",
      overlayX: "start",
      overlayY: "top"
    }, {
      originX: "start",
      originY: "top",
      overlayX: "start",
      overlayY: "bottom",
      panelClass: "mat-timepicker-above"
    }]);
    this._overlayRef = createOverlayRef(this._injector, {
      positionStrategy,
      scrollStrategy: this._scrollStrategyFactory(),
      direction: this._dir || "ltr",
      hasBackdrop: false,
      disableAnimations: this._animationsDisabled,
      panelClass: this.panelClass()
    });
    this._overlayRef.detachments().subscribe(() => this.close());
    this._overlayRef.keydownEvents().subscribe((event) => this._handleKeydown(event));
    this._overlayRef.outsidePointerEvents().subscribe((event) => {
      const target = _getEventTarget(event);
      const origin = this._input()?.getOverlayOrigin().nativeElement;
      if (target && origin && target !== origin && !origin.contains(target)) {
        this.close();
      }
    });
    return this._overlayRef;
  }
  _generateOptions() {
    const interval = this.interval() ?? 30 * 60;
    const options = this.options();
    if (options !== null) {
      this._timeOptions = options;
    } else {
      const input2 = this._input();
      const adapter = this._dateAdapter;
      const timeFormat = this._dateFormats.display.timeInput;
      const min = input2?.min() || adapter.setTime(adapter.today(), 0, 0, 0);
      const max = input2?.max() || adapter.setTime(adapter.today(), 23, 59, 0);
      const cacheKey = interval + "/" + adapter.format(min, timeFormat) + "/" + adapter.format(max, timeFormat);
      if (cacheKey !== this._optionsCacheKey) {
        this._optionsCacheKey = cacheKey;
        this._timeOptions = generateOptions(adapter, this._dateFormats, min, max, interval);
      }
    }
  }
  _syncSelectedState(value, options, fallback) {
    let hasSelected = false;
    for (const option of options) {
      if (value && this._dateAdapter.sameTime(option.value, value)) {
        option.select(false);
        scrollOptionIntoView(option, "center");
        untracked(() => this._keyManager.setActiveItem(option));
        hasSelected = true;
      } else {
        option.deselect(false);
      }
    }
    if (!hasSelected) {
      if (fallback) {
        untracked(() => this._keyManager.setActiveItem(fallback));
        scrollOptionIntoView(fallback, "center");
      } else {
        untracked(() => this._keyManager.setActiveItem(-1));
      }
    }
  }
  _handleKeydown(event) {
    const keyCode = event.keyCode;
    if (keyCode === TAB) {
      this.close();
    } else if (keyCode === ESCAPE && !hasModifierKey(event)) {
      event.preventDefault();
      this.close();
    } else if (keyCode === ENTER) {
      event.preventDefault();
      if (this._keyManager.activeItem) {
        this._selectValue(this._keyManager.activeItem);
      } else {
        this.close();
      }
    } else {
      const previousActive = this._keyManager.activeItem;
      this._keyManager.onKeydown(event);
      const currentActive = this._keyManager.activeItem;
      if (currentActive && currentActive !== previousActive) {
        scrollOptionIntoView(currentActive, "nearest");
      }
    }
  }
  _handleLocaleChanges() {
    this._localeChanges = this._dateAdapter.localeChanges.subscribe(() => {
      this._optionsCacheKey = null;
      if (this.isOpen()) {
        this._generateOptions();
      }
    });
  }
  _handleInputStateChanges() {
    effect(() => {
      const input2 = this._input();
      const options = this._options();
      if (this._isOpen() && input2) {
        this._syncSelectedState(input2.value(), options, null);
      }
    });
  }
  static ɵfac = function MatTimepicker_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MatTimepicker)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _MatTimepicker,
    selectors: [["mat-timepicker"]],
    viewQuery: function MatTimepicker_Query(rf, ctx) {
      if (rf & 1) {
        ɵɵviewQuerySignal(ctx._panelTemplate, _c0, 5)(ctx._options, MatOption, 5);
      }
      if (rf & 2) {
        ɵɵqueryAdvance(2);
      }
    },
    inputs: {
      interval: [1, "interval"],
      options: [1, "options"],
      disableRipple: [1, "disableRipple"],
      ariaLabel: [1, "aria-label", "ariaLabel"],
      ariaLabelledby: [1, "aria-labelledby", "ariaLabelledby"],
      panelClass: [1, "panelClass"]
    },
    outputs: {
      selected: "selected",
      opened: "opened",
      closed: "closed"
    },
    exportAs: ["matTimepicker"],
    features: [ɵɵProvidersFeature([{
      provide: MAT_OPTION_PARENT_COMPONENT,
      useExisting: _MatTimepicker
    }])],
    decls: 2,
    vars: 0,
    consts: [["panelTemplate", ""], ["role", "listbox", 1, "mat-timepicker-panel", 3, "animationend", "id"], [3, "value"], [3, "onSelectionChange", "value"]],
    template: function MatTimepicker_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵtemplate(0, MatTimepicker_ng_template_0_Template, 3, 7, "ng-template", null, 0, ɵɵtemplateRefExtractor);
      }
    },
    dependencies: [MatOption],
    styles: ["@keyframes _mat-timepicker-enter{from{opacity:0;transform:scaleY(0.8)}to{opacity:1;transform:none}}@keyframes _mat-timepicker-exit{from{opacity:1}to{opacity:0}}mat-timepicker{display:none}.mat-timepicker-panel{width:100%;max-height:256px;transform-origin:center top;overflow:auto;padding:8px 0;box-sizing:border-box;position:relative;border-bottom-left-radius:var(--mat-timepicker-container-shape, var(--mat-sys-corner-extra-small));border-bottom-right-radius:var(--mat-timepicker-container-shape, var(--mat-sys-corner-extra-small));box-shadow:var(--mat-timepicker-container-elevation-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12));background-color:var(--mat-timepicker-container-background-color, var(--mat-sys-surface-container))}@media(forced-colors: active){.mat-timepicker-panel{outline:solid 1px}}.mat-timepicker-above .mat-timepicker-panel{border-bottom-left-radius:0;border-bottom-right-radius:0;border-top-left-radius:var(--mat-timepicker-container-shape, var(--mat-sys-corner-extra-small));border-top-right-radius:var(--mat-timepicker-container-shape, var(--mat-sys-corner-extra-small))}.mat-timepicker-panel-animations-enabled{animation:_mat-timepicker-enter 120ms cubic-bezier(0, 0, 0.2, 1)}.mat-timepicker-panel-animations-enabled.mat-timepicker-panel-exit{animation:_mat-timepicker-exit 100ms linear}.mat-timepicker-input[readonly]{cursor:pointer}@media(forced-colors: active){.mat-timepicker-toggle-default-icon{color:CanvasText}}\n"],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatTimepicker, [{
    type: Component,
    args: [{
      selector: "mat-timepicker",
      exportAs: "matTimepicker",
      changeDetection: ChangeDetectionStrategy.OnPush,
      encapsulation: ViewEncapsulation.None,
      imports: [MatOption],
      providers: [{
        provide: MAT_OPTION_PARENT_COMPONENT,
        useExisting: MatTimepicker
      }],
      template: '<ng-template #panelTemplate>\n  <div\n    role="listbox"\n    class="mat-timepicker-panel"\n    [class.mat-timepicker-panel-animations-enabled]="!_animationsDisabled"\n    [class.mat-timepicker-panel-exit]="!isOpen()"\n    [attr.aria-label]="ariaLabel() || null"\n    [attr.aria-labelledby]="_getAriaLabelledby()"\n    [id]="panelId"\n    (animationend)="_handleAnimationEnd($event)">\n    @for (option of _timeOptions; track option.value) {\n      <mat-option\n        [value]="option.value"\n        (onSelectionChange)="_selectValue($event.source)">{{option.label}}</mat-option>\n    }\n  </div>\n</ng-template>\n',
      styles: ["@keyframes _mat-timepicker-enter{from{opacity:0;transform:scaleY(0.8)}to{opacity:1;transform:none}}@keyframes _mat-timepicker-exit{from{opacity:1}to{opacity:0}}mat-timepicker{display:none}.mat-timepicker-panel{width:100%;max-height:256px;transform-origin:center top;overflow:auto;padding:8px 0;box-sizing:border-box;position:relative;border-bottom-left-radius:var(--mat-timepicker-container-shape, var(--mat-sys-corner-extra-small));border-bottom-right-radius:var(--mat-timepicker-container-shape, var(--mat-sys-corner-extra-small));box-shadow:var(--mat-timepicker-container-elevation-shadow, 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12));background-color:var(--mat-timepicker-container-background-color, var(--mat-sys-surface-container))}@media(forced-colors: active){.mat-timepicker-panel{outline:solid 1px}}.mat-timepicker-above .mat-timepicker-panel{border-bottom-left-radius:0;border-bottom-right-radius:0;border-top-left-radius:var(--mat-timepicker-container-shape, var(--mat-sys-corner-extra-small));border-top-right-radius:var(--mat-timepicker-container-shape, var(--mat-sys-corner-extra-small))}.mat-timepicker-panel-animations-enabled{animation:_mat-timepicker-enter 120ms cubic-bezier(0, 0, 0.2, 1)}.mat-timepicker-panel-animations-enabled.mat-timepicker-panel-exit{animation:_mat-timepicker-exit 100ms linear}.mat-timepicker-input[readonly]{cursor:pointer}@media(forced-colors: active){.mat-timepicker-toggle-default-icon{color:CanvasText}}\n"]
    }]
  }], () => [], {
    _panelTemplate: [{
      type: ViewChild,
      args: ["panelTemplate", {
        isSignal: true
      }]
    }],
    _options: [{
      type: ViewChildren,
      args: [forwardRef(() => MatOption), {
        isSignal: true
      }]
    }],
    interval: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "interval",
        required: false
      }]
    }],
    options: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "options",
        required: false
      }]
    }],
    selected: [{
      type: Output,
      args: ["selected"]
    }],
    opened: [{
      type: Output,
      args: ["opened"]
    }],
    closed: [{
      type: Output,
      args: ["closed"]
    }],
    disableRipple: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "disableRipple",
        required: false
      }]
    }],
    ariaLabel: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "aria-label",
        required: false
      }]
    }],
    ariaLabelledby: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "aria-labelledby",
        required: false
      }]
    }],
    panelClass: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "panelClass",
        required: false
      }]
    }]
  });
})();
function scrollOptionIntoView(option, position) {
  option._getHostElement().scrollIntoView({
    block: position,
    inline: position
  });
}
var MatTimepickerInput = class _MatTimepickerInput {
  _elementRef = inject(ElementRef);
  _dateAdapter = inject(DateAdapter, {
    optional: true
  });
  _dateFormats = inject(MAT_DATE_FORMATS, {
    optional: true
  });
  _formField = inject(MAT_FORM_FIELD, {
    optional: true
  });
  _onChange;
  _onTouched;
  _validatorOnChange;
  _cleanupClick;
  _accessorDisabled = signal(false, ...ngDevMode ? [{
    debugName: "_accessorDisabled"
  }] : []);
  _localeSubscription;
  _timepickerSubscription;
  _validator;
  _lastValueValid = true;
  _minValid = true;
  _maxValid = true;
  _lastValidDate = null;
  _ariaActiveDescendant = computed(() => {
    const timepicker = this.timepicker();
    const isOpen = timepicker.isOpen();
    const activeDescendant = timepicker.activeDescendant();
    return isOpen && activeDescendant ? activeDescendant : null;
  }, ...ngDevMode ? [{
    debugName: "_ariaActiveDescendant"
  }] : []);
  _ariaExpanded = computed(() => this.timepicker().isOpen() + "", ...ngDevMode ? [{
    debugName: "_ariaExpanded"
  }] : []);
  _ariaControls = computed(() => {
    const timepicker = this.timepicker();
    return timepicker.isOpen() ? timepicker.panelId : null;
  }, ...ngDevMode ? [{
    debugName: "_ariaControls"
  }] : []);
  value = model(null, ...ngDevMode ? [{
    debugName: "value"
  }] : []);
  timepicker = input.required(__spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "timepicker"
  } : {}), {
    alias: "matTimepicker"
  }));
  min = input(null, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "min"
  } : {}), {
    alias: "matTimepickerMin",
    transform: (value) => this._transformDateInput(value)
  }));
  max = input(null, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "max"
  } : {}), {
    alias: "matTimepickerMax",
    transform: (value) => this._transformDateInput(value)
  }));
  openOnClick = input(true, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "openOnClick"
  } : {}), {
    alias: "matTimepickerOpenOnClick",
    transform: booleanAttribute
  }));
  disabled = computed(() => this.disabledInput() || this._accessorDisabled(), ...ngDevMode ? [{
    debugName: "disabled"
  }] : []);
  disabledInput = input(false, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "disabledInput"
  } : {}), {
    transform: booleanAttribute,
    alias: "disabled"
  }));
  constructor() {
    if (typeof ngDevMode === "undefined" || ngDevMode) {
      validateAdapter(this._dateAdapter, this._dateFormats);
    }
    const renderer = inject(Renderer2);
    this._validator = this._getValidator();
    this._updateFormsState();
    this._registerTimepicker();
    this._localeSubscription = this._dateAdapter.localeChanges.subscribe(() => {
      if (!this._hasFocus()) {
        this._formatValue(this.value());
      }
    });
    this._cleanupClick = renderer.listen(this.getOverlayOrigin().nativeElement, "click", this._handleClick);
  }
  writeValue(value) {
    const deserialized = this._dateAdapter.deserialize(value);
    this.value.set(this._dateAdapter.getValidDateOrNull(deserialized));
  }
  registerOnChange(fn) {
    this._onChange = fn;
  }
  registerOnTouched(fn) {
    this._onTouched = fn;
  }
  setDisabledState(isDisabled) {
    this._accessorDisabled.set(isDisabled);
  }
  validate(control) {
    return this._validator(control);
  }
  registerOnValidatorChange(fn) {
    this._validatorOnChange = fn;
  }
  getOverlayOrigin() {
    return this._formField?.getConnectedOverlayOrigin() || this._elementRef;
  }
  focus() {
    this._elementRef.nativeElement.focus();
  }
  ngOnDestroy() {
    this._cleanupClick();
    this._timepickerSubscription?.unsubscribe();
    this._localeSubscription.unsubscribe();
  }
  getLabelId() {
    return this._formField?.getLabelId() || null;
  }
  _handleClick = (event) => {
    if (this.disabled() || !this.openOnClick()) {
      return;
    }
    const target = _getEventTarget(event);
    const overlayHost = this.timepicker()._getOverlayHost();
    if (!target || !overlayHost || !overlayHost.contains(target)) {
      this.timepicker().open();
    }
  };
  _handleInput(event) {
    const value = event.target.value;
    const currentValue = this.value();
    const date = this._dateAdapter.parseTime(value, this._dateFormats.parse.timeInput);
    const hasChanged = !this._dateAdapter.sameTime(date, currentValue);
    if (!date || hasChanged || !!(value && !currentValue)) {
      this._assignUserSelection(date, true);
    } else {
      this._validatorOnChange?.();
    }
  }
  _handleBlur() {
    const value = this.value();
    if (value && this._isValid(value)) {
      this._formatValue(value);
    }
    if (!this.timepicker().isOpen()) {
      this._onTouched?.();
    }
  }
  _handleKeydown(event) {
    if (this.timepicker().isOpen() || this.disabled()) {
      return;
    }
    if (event.keyCode === ESCAPE && !hasModifierKey(event) && this.value() !== null) {
      event.preventDefault();
      this.value.set(null);
      this._formatValue(null);
    } else if (event.keyCode === DOWN_ARROW || event.keyCode === UP_ARROW) {
      event.preventDefault();
      this.timepicker().open();
    }
  }
  timepickerValueAssigned(value) {
    if (!this._dateAdapter.sameTime(value, this.value())) {
      this._assignUserSelection(value, true);
      this._formatValue(value);
    }
  }
  _updateFormsState() {
    effect(() => {
      const {
        _dateAdapter: adapter,
        _lastValueValid: prevValueValid,
        _minValid: prevMinValid,
        _maxValid: prevMaxValid
      } = this;
      const value = adapter.deserialize(this.value());
      const min = this.min();
      const max = this.max();
      const valueValid = this._lastValueValid = this._isValid(value);
      this._minValid = !min || !value || !valueValid || adapter.compareTime(min, value) <= 0;
      this._maxValid = !max || !value || !valueValid || adapter.compareTime(max, value) >= 0;
      const stateChanged = prevValueValid !== valueValid || prevMinValid !== this._minValid || prevMaxValid !== this._maxValid;
      if (!this._hasFocus()) {
        this._formatValue(value);
      }
      if (value && valueValid) {
        this._lastValidDate = value;
      }
      if (stateChanged) {
        this._validatorOnChange?.();
      }
    });
  }
  _registerTimepicker() {
    effect(() => {
      const timepicker = this.timepicker();
      timepicker.registerInput(this);
      timepicker.closed.subscribe(() => this._onTouched?.());
    });
  }
  _assignUserSelection(selection, propagateToAccessor) {
    let toAssign;
    if (selection == null || !this._isValid(selection)) {
      toAssign = selection;
    } else {
      const adapter = this._dateAdapter;
      const target = adapter.getValidDateOrNull(this._lastValidDate || this.value());
      const hours = adapter.getHours(selection);
      const minutes = adapter.getMinutes(selection);
      const seconds = adapter.getSeconds(selection);
      toAssign = target ? adapter.setTime(target, hours, minutes, seconds) : selection;
    }
    if (propagateToAccessor) {
      this._onChange?.(toAssign);
    }
    this.value.set(toAssign);
  }
  _formatValue(value) {
    value = this._dateAdapter.getValidDateOrNull(value);
    this._elementRef.nativeElement.value = value == null ? "" : this._dateAdapter.format(value, this._dateFormats.display.timeInput);
  }
  _isValid(value) {
    return !value || this._dateAdapter.isValid(value);
  }
  _transformDateInput(value) {
    const date = typeof value === "string" ? this._dateAdapter.parseTime(value, this._dateFormats.parse.timeInput) : this._dateAdapter.deserialize(value);
    return date && this._dateAdapter.isValid(date) ? date : null;
  }
  _hasFocus() {
    return _getFocusedElementPierceShadowDom() === this._elementRef.nativeElement;
  }
  _getValidator() {
    return Validators.compose([() => this._lastValueValid ? null : {
      "matTimepickerParse": {
        "text": this._elementRef.nativeElement.value
      }
    }, (control) => this._minValid ? null : {
      "matTimepickerMin": {
        "min": this.min(),
        "actual": this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(control.value))
      }
    }, (control) => this._maxValid ? null : {
      "matTimepickerMax": {
        "max": this.max(),
        "actual": this._dateAdapter.getValidDateOrNull(this._dateAdapter.deserialize(control.value))
      }
    }]);
  }
  static ɵfac = function MatTimepickerInput_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MatTimepickerInput)();
  };
  static ɵdir = ɵɵdefineDirective({
    type: _MatTimepickerInput,
    selectors: [["input", "matTimepicker", ""]],
    hostAttrs: ["role", "combobox", "type", "text", "aria-haspopup", "listbox", 1, "mat-timepicker-input"],
    hostVars: 5,
    hostBindings: function MatTimepickerInput_HostBindings(rf, ctx) {
      if (rf & 1) {
        ɵɵlistener("blur", function MatTimepickerInput_blur_HostBindingHandler() {
          return ctx._handleBlur();
        })("input", function MatTimepickerInput_input_HostBindingHandler($event) {
          return ctx._handleInput($event);
        })("keydown", function MatTimepickerInput_keydown_HostBindingHandler($event) {
          return ctx._handleKeydown($event);
        });
      }
      if (rf & 2) {
        let tmp_4_0;
        ɵɵdomProperty("disabled", ctx.disabled());
        ɵɵattribute("aria-activedescendant", ctx._ariaActiveDescendant())("aria-expanded", ctx._ariaExpanded())("aria-controls", ctx._ariaControls())("mat-timepicker-id", (tmp_4_0 = ctx.timepicker()) == null ? null : tmp_4_0.panelId);
      }
    },
    inputs: {
      value: [1, "value"],
      timepicker: [1, "matTimepicker", "timepicker"],
      min: [1, "matTimepickerMin", "min"],
      max: [1, "matTimepickerMax", "max"],
      openOnClick: [1, "matTimepickerOpenOnClick", "openOnClick"],
      disabledInput: [1, "disabled", "disabledInput"]
    },
    outputs: {
      value: "valueChange"
    },
    exportAs: ["matTimepickerInput"],
    features: [ɵɵProvidersFeature([{
      provide: NG_VALUE_ACCESSOR,
      useExisting: _MatTimepickerInput,
      multi: true
    }, {
      provide: NG_VALIDATORS,
      useExisting: _MatTimepickerInput,
      multi: true
    }, {
      provide: MAT_INPUT_VALUE_ACCESSOR,
      useExisting: _MatTimepickerInput
    }])]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatTimepickerInput, [{
    type: Directive,
    args: [{
      selector: "input[matTimepicker]",
      exportAs: "matTimepickerInput",
      host: {
        "class": "mat-timepicker-input",
        "role": "combobox",
        "type": "text",
        "aria-haspopup": "listbox",
        "[attr.aria-activedescendant]": "_ariaActiveDescendant()",
        "[attr.aria-expanded]": "_ariaExpanded()",
        "[attr.aria-controls]": "_ariaControls()",
        "[attr.mat-timepicker-id]": "timepicker()?.panelId",
        "[disabled]": "disabled()",
        "(blur)": "_handleBlur()",
        "(input)": "_handleInput($event)",
        "(keydown)": "_handleKeydown($event)"
      },
      providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: MatTimepickerInput,
        multi: true
      }, {
        provide: NG_VALIDATORS,
        useExisting: MatTimepickerInput,
        multi: true
      }, {
        provide: MAT_INPUT_VALUE_ACCESSOR,
        useExisting: MatTimepickerInput
      }]
    }]
  }], () => [], {
    value: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "value",
        required: false
      }]
    }, {
      type: Output,
      args: ["valueChange"]
    }],
    timepicker: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "matTimepicker",
        required: true
      }]
    }],
    min: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "matTimepickerMin",
        required: false
      }]
    }],
    max: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "matTimepickerMax",
        required: false
      }]
    }],
    openOnClick: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "matTimepickerOpenOnClick",
        required: false
      }]
    }],
    disabledInput: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "disabled",
        required: false
      }]
    }]
  });
})();
var MatTimepickerToggle = class _MatTimepickerToggle {
  _defaultConfig = inject(MAT_TIMEPICKER_CONFIG, {
    optional: true
  });
  _defaultTabIndex = (() => {
    const value = inject(new HostAttributeToken("tabindex"), {
      optional: true
    });
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  })();
  _isDisabled = computed(() => {
    const timepicker = this.timepicker();
    return this.disabled() || timepicker.disabled();
  }, ...ngDevMode ? [{
    debugName: "_isDisabled"
  }] : []);
  timepicker = input.required(__spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "timepicker"
  } : {}), {
    alias: "for"
  }));
  ariaLabel = input(void 0, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "ariaLabel"
  } : {}), {
    alias: "aria-label"
  }));
  ariaLabelledby = input(void 0, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "ariaLabelledby"
  } : {}), {
    alias: "aria-labelledby"
  }));
  _defaultAriaLabel = "Open timepicker options";
  disabled = input(false, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "disabled"
  } : {}), {
    transform: booleanAttribute,
    alias: "disabled"
  }));
  tabIndex = input(this._defaultTabIndex, ...ngDevMode ? [{
    debugName: "tabIndex"
  }] : []);
  disableRipple = input(this._defaultConfig?.disableRipple ?? false, __spreadProps(__spreadValues({}, ngDevMode ? {
    debugName: "disableRipple"
  } : {}), {
    transform: booleanAttribute
  }));
  _open(event) {
    if (this.timepicker() && !this._isDisabled()) {
      this.timepicker().open();
      event.stopPropagation();
    }
  }
  getAriaLabel() {
    return this.ariaLabelledby() ? null : this.ariaLabel() || this._defaultAriaLabel;
  }
  static ɵfac = function MatTimepickerToggle_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MatTimepickerToggle)();
  };
  static ɵcmp = ɵɵdefineComponent({
    type: _MatTimepickerToggle,
    selectors: [["mat-timepicker-toggle"]],
    hostAttrs: [1, "mat-timepicker-toggle"],
    hostVars: 1,
    hostBindings: function MatTimepickerToggle_HostBindings(rf, ctx) {
      if (rf & 1) {
        ɵɵlistener("click", function MatTimepickerToggle_click_HostBindingHandler($event) {
          return ctx._open($event);
        });
      }
      if (rf & 2) {
        ɵɵattribute("tabindex", null);
      }
    },
    inputs: {
      timepicker: [1, "for", "timepicker"],
      ariaLabel: [1, "aria-label", "ariaLabel"],
      ariaLabelledby: [1, "aria-labelledby", "ariaLabelledby"],
      disabled: [1, "disabled"],
      tabIndex: [1, "tabIndex"],
      disableRipple: [1, "disableRipple"]
    },
    exportAs: ["matTimepickerToggle"],
    ngContentSelectors: _c2,
    decls: 3,
    vars: 6,
    consts: [["matIconButton", "", "type", "button", "aria-haspopup", "listbox", 3, "tabIndex", "disabled", "disableRipple"], ["height", "24px", "width", "24px", "viewBox", "0 -960 960 960", "fill", "currentColor", "focusable", "false", "aria-hidden", "true", 1, "mat-timepicker-toggle-default-icon"], ["d", "m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"]],
    template: function MatTimepickerToggle_Template(rf, ctx) {
      if (rf & 1) {
        ɵɵprojectionDef(_c1);
        ɵɵelementStart(0, "button", 0);
        ɵɵprojection(1, 0, null, MatTimepickerToggle_ProjectionFallback_1_Template, 2, 0);
        ɵɵelementEnd();
      }
      if (rf & 2) {
        ɵɵproperty("tabIndex", ctx._isDisabled() ? -1 : ctx.tabIndex())("disabled", ctx._isDisabled())("disableRipple", ctx.disableRipple());
        ɵɵattribute("aria-label", ctx.getAriaLabel())("aria-labelledby", ctx.ariaLabelledby())("aria-expanded", ctx.timepicker().isOpen());
      }
    },
    dependencies: [MatIconButton],
    encapsulation: 2,
    changeDetection: 0
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatTimepickerToggle, [{
    type: Component,
    args: [{
      selector: "mat-timepicker-toggle",
      host: {
        "class": "mat-timepicker-toggle",
        "[attr.tabindex]": "null",
        "(click)": "_open($event)"
      },
      exportAs: "matTimepickerToggle",
      encapsulation: ViewEncapsulation.None,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [MatIconButton],
      template: '<button\n  matIconButton\n  type="button"\n  aria-haspopup="listbox"\n  [attr.aria-label]="getAriaLabel()"\n  [attr.aria-labelledby]="ariaLabelledby()"\n  [attr.aria-expanded]="timepicker().isOpen()"\n  [tabIndex]="_isDisabled() ? -1 : tabIndex()"\n  [disabled]="_isDisabled()"\n  [disableRipple]="disableRipple()">\n\n  <ng-content select="[matTimepickerToggleIcon]">\n    <svg\n      class="mat-timepicker-toggle-default-icon"\n      height="24px"\n      width="24px"\n      viewBox="0 -960 960 960"\n      fill="currentColor"\n      focusable="false"\n      aria-hidden="true">\n      <path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"/>\n    </svg>\n  </ng-content>\n</button>\n'
    }]
  }], null, {
    timepicker: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "for",
        required: true
      }]
    }],
    ariaLabel: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "aria-label",
        required: false
      }]
    }],
    ariaLabelledby: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "aria-labelledby",
        required: false
      }]
    }],
    disabled: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "disabled",
        required: false
      }]
    }],
    tabIndex: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "tabIndex",
        required: false
      }]
    }],
    disableRipple: [{
      type: Input,
      args: [{
        isSignal: true,
        alias: "disableRipple",
        required: false
      }]
    }]
  });
})();
var MatTimepickerModule = class _MatTimepickerModule {
  static ɵfac = function MatTimepickerModule_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _MatTimepickerModule)();
  };
  static ɵmod = ɵɵdefineNgModule({
    type: _MatTimepickerModule,
    imports: [MatTimepicker, MatTimepickerInput, MatTimepickerToggle],
    exports: [CdkScrollableModule, MatTimepicker, MatTimepickerInput, MatTimepickerToggle]
  });
  static ɵinj = ɵɵdefineInjector({
    imports: [MatTimepicker, MatTimepickerToggle, CdkScrollableModule]
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MatTimepickerModule, [{
    type: NgModule,
    args: [{
      imports: [MatTimepicker, MatTimepickerInput, MatTimepickerToggle],
      exports: [CdkScrollableModule, MatTimepicker, MatTimepickerInput, MatTimepickerToggle]
    }]
  }], null, null);
})();
export {
  MAT_TIMEPICKER_CONFIG,
  MAT_TIMEPICKER_SCROLL_STRATEGY,
  MatTimepicker,
  MatTimepickerInput,
  MatTimepickerModule,
  MatTimepickerToggle
};
//# sourceMappingURL=@angular_material_timepicker.js.map
