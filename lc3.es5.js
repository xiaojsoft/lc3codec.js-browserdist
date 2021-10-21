(function (global, namespace, modules) {
  var LOADED_MODULES = {};

  function ModuleGetParentPath(path) {
    var pos = path.lastIndexOf("/");

    if (pos < 0) {
      return "";
    } else {
      return path.substring(0, pos);
    }
  }

  function ModuleJoinPath(base_path, relative_path) {
    if (relative_path.length == 0) {
      return base_path;
    }

    var relative_fldrs = relative_path.split("/");

    for (var i = 0; i < relative_fldrs.length; ++i) {
      var fldr = relative_fldrs[i];

      if (fldr == ".") {} else if (fldr == "..") {
        if (base_path.length == 0) {
          throw new Error("Bad module path.");
        }

        base_path = ModuleGetParentPath(base_path);
      } else {
        if (base_path.length == 0) {
          base_path = fldr;
        } else {
          base_path = base_path + "/" + fldr;
        }
      }
    }

    return base_path;
  }

  function ModuleLoad(path) {
    if (!(path in modules)) {
      throw new Error("Module not found.");
    }

    if (path in LOADED_MODULES) {
      return LOADED_MODULES[path]["exports"];
    } else {
      var base_path = ModuleGetParentPath(path);
      var module_dict = {
        "exports": {}
      };
      LOADED_MODULES[path] = module_dict;
      modules[path].call(global, module_dict, function (rel_path) {
        return ModuleLoad(ModuleJoinPath(base_path, rel_path));
      });
      return module_dict["exports"];
    }
  }

  global[namespace] = ModuleLoad("browser/src/api");
})(window, "LC3", {
  "lc3/common/array_util": function lc3CommonArray_util(module, require) {
    function ArrayFlip(arr) {
      var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var end = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : arr.length;
      var left = start,
          right = end - 1;

      while (left < right) {
        var tmp = arr[left];
        arr[left] = arr[right];
        arr[right] = tmp;
        ++left;
        --right;
      }

      return arr;
    }

    module.exports = {
      "ArrayFlip": ArrayFlip
    };
  },
  "lc3/common/fs": function lc3CommonFs(module, require) {
    function LC3SampleRate(hz, hzsc, fsind, intrid) {
      this.getSampleRate = function () {
        return hz;
      };

      this.getScaledSampleRate = function () {
        return hzsc;
      };

      this.getSampleRateIndex = function () {
        return fsind;
      };

      this.getInternalIndex = function () {
        return intrid;
      };
    }

    LC3SampleRate.FS_08000 = new LC3SampleRate(8000, 8000, 0, 0);
    LC3SampleRate.FS_16000 = new LC3SampleRate(16000, 16000, 1, 1);
    LC3SampleRate.FS_24000 = new LC3SampleRate(24000, 24000, 2, 2);
    LC3SampleRate.FS_32000 = new LC3SampleRate(32000, 32000, 3, 3);
    LC3SampleRate.FS_44100 = new LC3SampleRate(44100, 48000, 4, 4);
    LC3SampleRate.FS_48000 = new LC3SampleRate(48000, 48000, 4, 5);
    module.exports = {
      "LC3SampleRate": LC3SampleRate
    };
  },
  "lc3/common/int_util": function lc3CommonInt_util(module, require) {
    function IntDiv(a, b) {
      a -= a % b;
      return Math.round(a / b);
    }

    module.exports = {
      "IntDiv": IntDiv
    };
  },
  "lc3/common/ltpf-common": function lc3CommonLtpfCommon(module, require) {
    var Lc3Error = require("./../error");

    var Lc3Fs = require("./fs");

    var Lc3Nms = require("./nms");

    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;

    function GetGainParameters(Nms, Fs, nbits) {
      var R = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : new Array(2);

      if (R.length != 2) {
        throw new LC3IllegalParameterError("R has an incorrect size (!= 2).");
      }

      var t_nbits;

      switch (Nms) {
        case LC3FrameDuration.NMS_07500US:
          t_nbits = Math.round(nbits * 10 / 7.5);
          break;

        case LC3FrameDuration.NMS_10000US:
          t_nbits = nbits;
          break;

        default:
          throw new LC3IllegalParameterError("Unsupported frame duration.");
      }

      var gain_ltpf, gain_ind;
      var fsi = Fs.getSampleRateIndex();
      var fsiMul80 = fsi * 80;

      if (t_nbits < 320 + fsiMul80) {
        gain_ltpf = 0.4;
        gain_ind = 0;
      } else if (t_nbits < 400 + fsiMul80) {
        gain_ltpf = 0.35;
        gain_ind = 1;
      } else if (t_nbits < 480 + fsiMul80) {
        gain_ltpf = 0.3;
        gain_ind = 2;
      } else if (t_nbits < 560 + fsiMul80) {
        gain_ltpf = 0.25;
        gain_ind = 3;
      } else {
        gain_ltpf = 0;
        gain_ind = 0;
      }

      R[0] = gain_ltpf;
      R[1] = gain_ind;
      return R;
    }

    module.exports = {
      "GetGainParameters": GetGainParameters
    };
  },
  "lc3/common/nms": function lc3CommonNms(module, require) {
    function LC3FrameDuration(us, intrid) {
      this.toMicroseconds = function () {
        return us;
      };

      this.getInternalIndex = function () {
        return intrid;
      };
    }

    LC3FrameDuration.NMS_07500US = new LC3FrameDuration(7500, 1);
    LC3FrameDuration.NMS_10000US = new LC3FrameDuration(10000, 0);
    module.exports = {
      "LC3FrameDuration": LC3FrameDuration
    };
  },
  "lc3/common/object_util": function lc3CommonObject_util(module, require) {
    var Inherits = function () {
      if (typeof Object.create == "function") {
        return function (ctor, super_ctor) {
          if (super_ctor) {
            ctor.super_ = super_ctor;
            ctor.prototype = Object.create(super_ctor.prototype, {
              "constructor": {
                "value": ctor,
                "enumerable": false,
                "writable": true,
                "configurable": true
              }
            });
          }
        };
      } else {
        return function (ctor, super_ctor) {
          if (super_ctor) {
            ctor.super_ = super_ctor;

            var tmp_ctor = function tmp_ctor() {};

            tmp_ctor.prototype = super_ctor.prototype;
            ctor.prototype = new tmp_ctor();
            ctor.prototype.constructor = ctor;
          }
        };
      }
    }();

    module.exports = {
      "Inherits": Inherits
    };
  },
  "lc3/common/slide_window": function lc3CommonSlide_window(module, require) {
    var Lc3Error = require("./../error");

    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var LC3IllegalIndexError = Lc3Error.LC3IllegalIndexError;

    function LC3SlideWindow(windowSize, historySize) {
      var fillValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
      var cursor = 0;
      var storageSize = windowSize + historySize;
      var storage = new Array(storageSize);

      for (var i = 0; i < storageSize; ++i) {
        storage[i] = fillValue;
      }

      var singlebuf = new Array(1);
      var self = this;

      this.append = function (items) {
        var n = items.length;
        var srcoff = 0,
            srcrem = n;

        if (n > storageSize) {
          srcoff = n - storageSize;
          srcrem = storageSize;
        }

        while (srcrem != 0) {
          var currem = storageSize - cursor;
          var c = srcrem;

          if (currem < c) {
            c = currem;
          }

          for (var _i = 0; _i < c; ++_i) {
            storage[cursor] = items[srcoff];
            ++cursor;
            ++srcoff;
          }

          if (cursor >= storageSize) {
            cursor = 0;
          }

          srcrem -= c;
        }
      };

      this.set = function (off, value) {
        singlebuf[0] = value;

        try {
          self.bulkSet(singlebuf, 0, off, 1);
        } catch (error) {
          throw new LC3IllegalIndexError("Illegal offset.");
        }
      };

      this.get = function (off) {
        try {
          self.bulkGet(singlebuf, 0, off, 1);
        } catch (error) {
          throw new LC3IllegalIndexError("Illegal offset.");
        }

        return singlebuf[0];
      };

      this.bulkSet = function (src, srcoff, offset, n) {
        if (n <= 0) {
          return;
        }

        var baseoff = historySize + offset;

        if (n > storageSize - baseoff) {
          throw new LC3IllegalParameterError("The count is out of range.");
        }

        if (offset >= 0) {
          if (offset >= windowSize) {
            throw new LC3IllegalIndexError("Illegal offset.");
          }
        } else {
          if (-offset > historySize) {
            throw new LC3IllegalIndexError("Illegal offset.");
          }
        }

        var srclen = src.length;

        if (srcoff < 0 || srcoff + n > srclen) {
          throw new LC3IllegalParameterError("The source doesn't contain enough items.");
        }

        var front = cursor + baseoff;

        if (front >= storageSize) {
          front -= storageSize;
        }

        while (n != 0) {
          var storrem = storageSize - front;
          var c = storrem;

          if (n < c) {
            c = n;
          }

          for (var _i2 = 0; _i2 < c; ++_i2) {
            storage[front] = src[srcoff];
            ++srcoff;
            ++front;
          }

          if (front >= storageSize) {
            front = 0;
          }

          n -= c;
        }
      };

      this.bulkGet = function (dst, dstoff, offset, n) {
        var baseoff = historySize + offset;

        if (n > storageSize - baseoff) {
          throw new LC3IllegalParameterError("No enough item(s).");
        }

        if (offset >= 0) {
          if (offset >= windowSize) {
            throw new LC3IllegalIndexError("Illegal offset.");
          }
        } else {
          if (-offset > historySize) {
            throw new LC3IllegalIndexError("Illegal offset.");
          }
        }

        var front = cursor + baseoff;

        if (front >= storageSize) {
          front -= storageSize;
        }

        while (n != 0) {
          var storrem = storageSize - front;
          var c = storrem;

          if (n < c) {
            c = n;
          }

          for (var _i3 = 0; _i3 < c; ++_i3) {
            dst[dstoff] = storage[front];
            ++dstoff;
            ++front;
          }

          if (front >= storageSize) {
            front = 0;
          }

          n -= c;
        }
      };
    }

    module.exports = {
      "LC3SlideWindow": LC3SlideWindow
    };
  },
  "lc3/common/uint": function lc3CommonUint(module, require) {
    var UINT32_MAX = 4294967295;

    function IsUInt32(x) {
      return Number.isInteger(x) && x >= 0 && x <= UINT32_MAX;
    }

    module.exports = {
      "UINT32_MAX": UINT32_MAX,
      "IsUInt32": IsUInt32
    };
  },
  "lc3/decoder/bec": function lc3DecoderBec(module, require) {
    function LC3BEC() {
      var initial = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var marked = initial;

      this.isMarked = function () {
        return marked;
      };

      this.mark = function () {
        marked = true;
      };

      this.clear = function () {
        marked = false;
      };
    }

    module.exports = {
      "LC3BEC": LC3BEC
    };
  },
  "lc3/decoder/decoder": function lc3DecoderDecoder(module, require) {
    var Lc3DcSns = require("./sns");

    var Lc3DcPlc = require("./plc");

    var Lc3DcMdct = require("./ld-mdct");

    var Lc3DcLtpf = require("./ltpf");

    var Lc3DcBec = require("./bec");

    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3IntUtil = require("./../common/int_util");

    var Lc3TblAcSpec = require("./../tables/ac_spec");

    var Lc3TblBW = require("./../tables/bw");

    var Lc3TblNE = require("./../tables/ne");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3TblNLE = require("./../tables/nle");

    var Lc3TblSQ = require("./../tables/sq");

    var Lc3TblTns = require("./../tables/tns");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3BEC = Lc3DcBec.LC3BEC;
    var LC3SpectralNoiseShapingDecoder = Lc3DcSns.LC3SpectralNoiseShapingDecoder;
    var LC3PacketLossConcealment = Lc3DcPlc.LC3PacketLossConcealment;
    var LC3MDCTSynthesizer = Lc3DcMdct.LC3MDCTSynthesizer;
    var LC3LongTermPostfilterDecoder = Lc3DcLtpf.LC3LongTermPostfilterDecoder;
    var AC_TNS_ORDER_CUMFREQ = Lc3TblTns.AC_TNS_ORDER_CUMFREQ;
    var AC_TNS_ORDER_FREQ = Lc3TblTns.AC_TNS_ORDER_FREQ;
    var AC_TNS_COEF_CUMFREQ = Lc3TblTns.AC_TNS_COEF_CUMFREQ;
    var AC_TNS_COEF_FREQ = Lc3TblTns.AC_TNS_COEF_FREQ;
    var TNS_PARAM_NUM_TNS_FILTERS = Lc3TblTns.TNS_PARAM_NUM_TNS_FILTERS;
    var TNS_PARAM_START_FREQ = Lc3TblTns.TNS_PARAM_START_FREQ;
    var TNS_PARAM_STOP_FREQ = Lc3TblTns.TNS_PARAM_STOP_FREQ;
    var TNS_LPC_WEIGHTING_TH = Lc3TblTns.TNS_LPC_WEIGHTING_TH;
    var AC_SPEC_LOOKUP = Lc3TblAcSpec.AC_SPEC_LOOKUP;
    var AC_SPEC_CUMFREQ = Lc3TblAcSpec.AC_SPEC_CUMFREQ;
    var AC_SPEC_FREQ = Lc3TblAcSpec.AC_SPEC_FREQ;
    var NE_TBL = Lc3TblNE.NE_TBL;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var NBITSLASTNZ_TBL = Lc3TblSQ.NBITSLASTNZ_TBL;
    var GGOFF_TBL = Lc3TblSQ.GGOFF_TBL;
    var BITRATE_C1 = Lc3TblSQ.BITRATE_C1;
    var NBITSBW_TBL = Lc3TblBW.NBITSBW_TBL;
    var NFSTART_TBL = Lc3TblNLE.NFSTART_TBL;
    var NFWIDTH_TBL = Lc3TblNLE.NFWIDTH_TBL;
    var BW_STOP_TBL = Lc3TblNLE.BW_STOP_TBL;
    var IntDiv = Lc3IntUtil.IntDiv;
    var CURMEMN = 2;
    var CURMEMB_BP = 0;
    var CURMEMB_BITNO = 1;
    var ACCTXMEMN = 4;
    var ACCTXMEMB_LOW = 0;
    var ACCTXMEMB_RANGE = 1;
    var ACCTXMEMB_BEC = 2;
    var ACCTXMEMB_BP = 3;
    var RCQ_C2 = 0.18479956785822313;

    function LC3Decoder(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var NE = NE_TBL[index_Nms][index_Fs];
      var NEDiv2 = NE >>> 1;
      var fsInd = Fs.getSampleRateIndex();
      var nbits_BW = NBITSBW_TBL[index_Nms][index_Fs];
      var nbits_lastnz = NBITSLASTNZ_TBL[index_Nms][index_Fs];
      var cur_side = new Array(CURMEMN);
      var tns_lpc_weighting_th = TNS_LPC_WEIGHTING_TH[index_Nms];
      var tns_RCorder = new Array(2);
      var tns_RCi = [new Array(8), new Array(8)];
      var tns_RCq = [new Array(8), new Array(8)];
      var tns_S = new Array(8);
      var tns_startfreq_Nms = TNS_PARAM_START_FREQ[index_Nms];
      var tns_stopfreq_Nms = TNS_PARAM_STOP_FREQ[index_Nms];
      var Xq = new Array(NE);
      var Xs = new Array(NE);
      var save_lev = new Array(NE);
      var resBits = new Array(3200);
      var nResBits = 0;
      var NFstart = NFSTART_TBL[index_Nms],
          NFwidth = NFWIDTH_TBL[index_Nms];
      var bw_stop_Nms = BW_STOP_TBL[index_Nms];
      var INF = new Array(NE);
      var sns = new LC3SpectralNoiseShapingDecoder(Nms, Fs);
      var plc = new LC3PacketLossConcealment(Nms, Fs);
      var imdct = new LC3MDCTSynthesizer(Nms, Fs);
      var ltpf_dec = new LC3LongTermPostfilterDecoder(Nms, Fs);

      this.getFrameSize = function () {
        return NF;
      };

      this.decode = function (bytes) {
        var bec = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new LC3BEC(false);
        var rbuf = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new Array(NF);

        if (!(typeof Int16Array != "undefined" && rbuf instanceof Int16Array)) {
          while (rbuf.length < NF) {
            rbuf.push(0);
          }
        }

        var rbufcap = rbuf.length;
        var nbytes = bytes.length;
        var nbits = nbytes << 3 >>> 0;

        if (nbytes < 20 || nbytes > 400) {
          bec.mark();
        }

        cur_side[CURMEMB_BP] = nbytes - 1;
        cur_side[CURMEMB_BITNO] = 0;
        var rateFlag = nbits > BITRATE_C1[fsInd] ? 512 : 0;
        var Pbw = 0;

        if (!bec.isMarked()) {
          if (nbits_BW > 0) {
            Pbw = Impl_ReadUInt(bytes, cur_side, nbits_BW);

            if (fsInd < Pbw) {
              bec.mark();
            }
          }
        }

        var lastnz = 0;

        if (!bec.isMarked()) {
          var tmp_lastnz = Impl_ReadUInt(bytes, cur_side, nbits_lastnz);
          lastnz = tmp_lastnz + 1 << 1 >>> 0;

          if (lastnz > NE) {
            bec.mark();
          }
        }

        var lsbMode = 0;

        if (!bec.isMarked()) {
          lsbMode = Impl_ReadBit(bytes, cur_side);
        }

        var gg_ind = 0;

        if (!bec.isMarked()) {
          gg_ind = Impl_ReadUInt(bytes, cur_side, 8);
        }

        var num_tns_filters = 0;

        for (var f = 0; f < 2; ++f) {
          tns_RCorder[f] = 0;
        }

        if (!bec.isMarked()) {
          num_tns_filters = TNS_PARAM_NUM_TNS_FILTERS[index_Nms][Pbw];

          for (var _f = 0; _f < num_tns_filters; ++_f) {
            tns_RCorder[_f] = Impl_ReadBit(bytes, cur_side);
          }
        }

        var ltpf_pitch_present = 0;

        if (!bec.isMarked()) {
          ltpf_pitch_present = Impl_ReadBit(bytes, cur_side);
        }

        var ind_LF = 0,
            ind_HF = 0;
        var submode_MSB = 0,
            submode_LSB = 0;
        var idxA = 0,
            idxB = 0;
        var Gind = 0;
        var LS_indA = 0,
            LS_indB = 0;
        var shape_j = 0,
            gain_i = 0;

        if (!bec.isMarked()) {
          ind_LF = Impl_ReadUInt(bytes, cur_side, 5);
          ind_HF = Impl_ReadUInt(bytes, cur_side, 5);
          submode_MSB = Impl_ReadBit(bytes, cur_side);

          if (submode_MSB == 0) {
            Gind = Impl_ReadUInt(bytes, cur_side, 1);
          } else {
            Gind = Impl_ReadUInt(bytes, cur_side, 2);
          }

          LS_indA = Impl_ReadBit(bytes, cur_side);

          if (submode_MSB == 0) {
            var cwRx = Impl_ReadUInt(bytes, cur_side, 25);
            var szA = 2390004,
                szB = 14;
            var idxBorGainLSB;

            if (cwRx >= szB * szA) {
              idxA = 0;
              idxBorGainLSB = 0;
              submode_LSB = 0;
              bec.mark();
            } else {
              idxBorGainLSB = IntDiv(cwRx, szA);
              idxA = cwRx - idxBorGainLSB * szA;
              idxBorGainLSB -= 2;
              submode_LSB = idxBorGainLSB < 0 ? 1 : 0;
              idxBorGainLSB = idxBorGainLSB + 2 * submode_LSB;
            }

            if (submode_LSB != 0) {
              Gind = (Gind << 1 >>> 0) + idxBorGainLSB;
            } else {
              idxB = idxBorGainLSB >>> 1;
              LS_indB = (idxBorGainLSB & 1) >>> 0;
            }
          } else {
            var tmp = Impl_ReadUInt(bytes, cur_side, 24);
            idxA = tmp;
            submode_LSB = 0;

            if (tmp >= 16708096) {
                bec.mark();
              } else {
              tmp -= 15158272;

              if (tmp >= 0) {
                submode_LSB = 1;
                Gind = (Gind << 1 | tmp & 1) >>> 0;
                idxA = tmp >>> 1;
              }
            }
          }

          shape_j = (submode_MSB << 1 >>> 0) + submode_LSB;
          gain_i = Gind;
        }

        var ltpf_active = 0;
        var ltpf_pitch_index = 0;

        if (!bec.isMarked()) {
          if (ltpf_pitch_present != 0) {
            ltpf_active = Impl_ReadUInt(bytes, cur_side, 1);
            ltpf_pitch_index = Impl_ReadUInt(bytes, cur_side, 9);
          }
        }

        var F_NF = 0;

        if (!bec.isMarked()) {
          F_NF = Impl_ReadUInt(bytes, cur_side, 3);
        }

        var ac_ctx = new Array(ACCTXMEMN);
        Impl_AcDecInit(bytes, ac_ctx, bec);
        var tns_lpc_weighting = nbits < tns_lpc_weighting_th ? 1 : 0;

        for (var _f2 = 0; _f2 < 2; ++_f2) {
          var RCi_f = tns_RCi[_f2];

          for (var k = 0; k < 8; ++k) {
            RCi_f[k] = 8;
          }
        }

        if (!bec.isMarked()) {
          tnsloop: for (var _f3 = 0; _f3 < num_tns_filters; ++_f3) {
            if (tns_RCorder[_f3] > 0) {
              var RCorder_fS1 = Impl_AcDecode(bytes, ac_ctx, AC_TNS_ORDER_CUMFREQ[tns_lpc_weighting], AC_TNS_ORDER_FREQ[tns_lpc_weighting], 8);

              if (bec.isMarked()) {
                break tnsloop;
              }

              tns_RCorder[_f3] = RCorder_fS1 + 1;
              var _RCi_f = tns_RCi[_f3];

              for (var _k = 0; _k <= RCorder_fS1; ++_k) {
                var RCi_f_k = Impl_AcDecode(bytes, ac_ctx, AC_TNS_COEF_CUMFREQ[_k], AC_TNS_COEF_FREQ[_k], 17);

                if (bec.isMarked()) {
                  break tnsloop;
                }

                _RCi_f[_k] = RCi_f_k;
              }
            }
          }
        }

        if (!bec.isMarked()) {
          var c = 0;

          for (var _k2 = 0; _k2 < lastnz; _k2 += 2) {
            var t = c + rateFlag;

            if (_k2 > NEDiv2) {
              t += 256;
            }

            var Xq_k0 = 0,
                Xq_k1 = 0;
            var lev = 0;
            var sym = 0;

            for (; lev < 14; ++lev) {
              var pki = AC_SPEC_LOOKUP[t + (Math.min(lev, 3) << 10 >>> 0)];
              sym = Impl_AcDecode(bytes, ac_ctx, AC_SPEC_CUMFREQ[pki], AC_SPEC_FREQ[pki], 17);

              if (sym < 16) {
                break;
              }

              if (lsbMode == 0 || lev > 0) {
                var bit = Impl_ReadBit(bytes, cur_side);
                Xq_k0 += bit << lev >>> 0;
                bit = Impl_ReadBit(bytes, cur_side);
                Xq_k1 += bit << lev >>> 0;
              }
            }

            if (lev == 14) {
              bec.mark();
              break;
            }

            if (lsbMode == 1) {
              save_lev[_k2] = lev;
            }

            var a = (sym & 3) >>> 0;
            var b = sym >>> 2;
            Xq_k0 += a << lev >>> 0;
            Xq_k1 += b << lev >>> 0;

            if (Xq_k0 > 0) {
                var _bit = Impl_ReadBit(bytes, cur_side);

                if (_bit == 1) {
                  Xq_k0 = -Xq_k0;
                }
              }

            if (Xq_k1 > 0) {
                var _bit2 = Impl_ReadBit(bytes, cur_side);

                if (_bit2 == 1) {
                  Xq_k1 = -Xq_k1;
                }
              }

            if (lev > 3) {
              lev = 3;
            }

            if (lev <= 1) {
              t = 1 + (a + b) * (lev + 1);
            } else {
              t = 12 + lev;
            }

            c = ((c & 15) << 4 >>> 0) + t;
            Xq[_k2] = Xq_k0;
            Xq[_k2 + 1] = Xq_k1;

            if (ac_ctx[ACCTXMEMB_BP] - cur_side[CURMEMB_BP] > 3) {
              bec.mark();
              break;
            }
          }

          for (var _k3 = lastnz; _k3 < NE; ++_k3) {
            Xq[_k3] = 0;
          }
        }

        var nbits_residual = 0;

        if (!bec.isMarked()) {
          var nbits_side = nbits - ((cur_side[CURMEMB_BP] << 3 >>> 0) + 8 - cur_side[CURMEMB_BITNO]);
          var nbits_ari = (ac_ctx[ACCTXMEMB_BP] - 3 << 3 >>> 0) + 25 - Math.trunc(Math.log2(ac_ctx[ACCTXMEMB_RANGE]));
          nbits_residual = nbits - (nbits_side + nbits_ari);

          if (nbits_residual < 0) {
            bec.mark();
          }
        }

        nResBits = 0;

        if (!bec.isMarked()) {
          if (lsbMode == 0) {
            for (var _k4 = 0; _k4 < NE; ++_k4) {
              if (Xq[_k4] != 0) {
                if (nResBits == nbits_residual) {
                  break;
                }

                resBits[nResBits] = Impl_ReadBit(bytes, cur_side);
                ++nResBits;
              }
            }
          } else {
            for (var _k5 = 0; _k5 < lastnz; _k5 += 2) {
              if (save_lev[_k5] > 0) {
                if (nbits_residual == 0) {
                  break;
                }

                var _bit3 = Impl_ReadBit(bytes, cur_side);

                --nbits_residual;

                if (_bit3 == 1) {
                  var Xq_k = Xq[_k5];

                  if (Xq_k > 0) {
                    ++Xq[_k5];
                  } else if (Xq_k < 0) {
                    --Xq[_k5];
                  } else {
                    if (nbits_residual == 0) {
                      break;
                    }

                    _bit3 = Impl_ReadBit(bytes, cur_side);
                    --nbits_residual;

                    if (_bit3 == 0) {
                      Xq[_k5] = 1;
                    } else {
                      Xq[_k5] = -1;
                    }
                  }
                }

                if (nbits_residual == 0) {
                  break;
                }

                _bit3 = Impl_ReadBit(bytes, cur_side);
                --nbits_residual;

                if (_bit3 == 1) {
                  var k1 = _k5 + 1;
                  var _Xq_k = Xq[k1];

                  if (_Xq_k > 0) {
                    ++Xq[k1];
                  } else if (_Xq_k < 0) {
                    --Xq[k1];
                  } else {
                    if (nbits_residual == 0) {
                      break;
                    }

                    _bit3 = Impl_ReadBit(bytes, cur_side);
                    --nbits_residual;

                    if (_bit3 == 0) {
                      Xq[k1] = 1;
                    } else {
                      Xq[k1] = -1;
                    }
                  }
                }
              }
            }
          }
        }

        var nf_seed = 0;

        if (!bec.isMarked()) {
          var _tmp = 0;

          for (var _k6 = 0; _k6 < NE; ++_k6) {
            _tmp += Math.abs(Xq[_k6]) * _k6;
            _tmp &= 0xffff;
          }

          nf_seed = _tmp >>> 0;
        }

        var zeroFrameFlag = 0;

        if (!bec.isMarked()) {
          if (lastnz == 2 && Xq[0] == 0 && Xq[1] == 0 && gg_ind == 0 && F_NF == 7) {
            zeroFrameFlag = 1;
          }
        }

        if (!bec.isMarked()) {
          if (lsbMode == 0) {
            var _k7 = 0,
                n = 0;

            while (_k7 < NE && n < nResBits) {
              var _Xq_k2 = Xq[_k7];

              if (_Xq_k2 != 0) {
                if (resBits[n] == 0) {
                  if (_Xq_k2 > 0) {
                    Xq[_k7] -= 0.1875;
                  } else {
                    Xq[_k7] -= 0.3125;
                  }
                } else {
                  if (_Xq_k2 > 0) {
                    Xq[_k7] += 0.3125;
                  } else {
                    Xq[_k7] += 0.1875;
                  }
                }

                ++n;
              }

              ++_k7;
            }
          }
        }

        if (!bec.isMarked()) {
          if (zeroFrameFlag == 0) {
            var bw_stop = bw_stop_Nms[Pbw];

            for (var _k8 = 0; _k8 < bw_stop; ++_k8) {
              var INF_flag = false;

              if (_k8 >= NFstart && _k8 < bw_stop) {
                INF_flag = true;

                for (var i = _k8 - NFwidth, iEnd = Math.min(bw_stop - 1, _k8 + NFwidth); i <= iEnd; ++i) {
                  if (Math.abs(Xq[i]) >= 1e-31) {
                    INF_flag = false;
                    break;
                  }
                }
              }

              INF[_k8] = INF_flag;
            }

            var L_hat_NF = (8 - F_NF) / 16;

            for (var _k9 = 0; _k9 < bw_stop; ++_k9) {
              if (INF[_k9]) {
                nf_seed = (13849 + nf_seed * 31821 & 0xFFFF) >>> 0;

                if (nf_seed < 0x8000) {
                  Xq[_k9] = L_hat_NF;
                } else {
                  Xq[_k9] = -L_hat_NF;
                }
              }
            }
          }
        }

        var Xf = Xq;
        var gg_off = 0;

        if (!bec.isMarked()) {
          gg_off = GGOFF_TBL[fsInd][nbytes - 20];
          var gg = Math.pow(10, (gg_ind + gg_off) / 28);

          for (var _k10 = 0; _k10 < NE; ++_k10) {
            Xf[_k10] *= gg;
          }
        }

        if (!bec.isMarked()) {
          for (var _f4 = 0; _f4 < 2; ++_f4) {
            var _RCi_f2 = tns_RCi[_f4];
            var RCq_f = tns_RCq[_f4];

            for (var _k11 = 0; _k11 < 8; ++_k11) {
              RCq_f[_k11] = Math.sin((_RCi_f2[_k11] - 8) * RCQ_C2);
            }
          }

          var start_freq = tns_startfreq_Nms[Pbw];
          var stop_freq = tns_stopfreq_Nms[Pbw];

          for (var _k12 = 0; _k12 < NE; ++_k12) {
            Xs[_k12] = Xf[_k12];
          }

          for (var _k13 = 0; _k13 < 8; ++_k13) {
            tns_S[_k13] = 0;
          }

          for (var _f5 = 0; _f5 < num_tns_filters; ++_f5) {
            var _RCorder_fS = tns_RCorder[_f5] - 1;

            var _RCq_f = tns_RCq[_f5];

            if (_RCorder_fS >= 0) {
              for (var _n = start_freq[_f5], nEnd = stop_freq[_f5]; _n < nEnd; ++_n) {
                var _t = Xf[_n] - _RCq_f[_RCorder_fS] * tns_S[_RCorder_fS];

                for (var _k14 = _RCorder_fS - 1; _k14 >= 0; --_k14) {
                  _t -= _RCq_f[_k14] * tns_S[_k14];
                  tns_S[_k14 + 1] = _RCq_f[_k14] * _t + tns_S[_k14];
                }

                Xs[_n] = _t;
                tns_S[0] = _t;
              }
            }
          }
        }

        var X_hat = null;

        if (!bec.isMarked()) {
          var succeed = sns.update(ind_LF, ind_HF, shape_j, gain_i, LS_indA, idxA, LS_indB, idxB, Xs);

          if (succeed) {
            X_hat = sns.getSpectrumCoefficients();
          } else {
            bec.mark();
          }
        }

        if (bec.isMarked()) {
          ltpf_active = 0;
          X_hat = plc.conceal();
        } else {
          plc.good(X_hat);
        }

        var x_hat = imdct.update(X_hat);
        var x_ltpf_hat = ltpf_dec.update(x_hat, ltpf_active, ltpf_pitch_index, nbits);

        for (var _i4 = 0, _iEnd = Math.min(NF, rbufcap); _i4 < _iEnd; ++_i4) {
          var _tmp2 = x_ltpf_hat[_i4];
          _tmp2 = Math.round(_tmp2);

          if (_tmp2 > 32767) {
            _tmp2 = 32767;
          } else if (_tmp2 < -32768) {
            _tmp2 = -32768;
          }

          rbuf[_i4] = _tmp2;
        }

        return rbuf;
      };
    }

    function Impl_ReadBit(bytes, cursor) {
      var bp = cursor[CURMEMB_BP];
      var bitno = cursor[CURMEMB_BITNO];

      try {
        var bv = bytes[bp];
        var bit = (bv & 1 << bitno) != 0 ? 1 : 0;

        if (bitno >= 7) {
          bitno = 0;
          --bp;
        } else {
          ++bitno;
        }

        return bit;
      } finally {
        cursor[CURMEMB_BP] = bp;
        cursor[CURMEMB_BITNO] = bitno;
      }
    }

    function Impl_ReadUInt(bytes, cursor, numbits) {
      var bp = cursor[CURMEMB_BP];
      var bitno = cursor[CURMEMB_BITNO];

      try {
        var value = 0;
        var vshift = 0;

        while (numbits != 0) {
          var bitrem = 8 - bitno;
          var bitnread = Math.min(bitrem, numbits);
          var bv = bytes[bp];
          bv = bv >>> bitno & (1 << bitnread >>> 0) - 1;
          value |= bv << vshift;
          bitno += bitnread;
          numbits -= bitnread;
          vshift += bitnread;

          if (bitno >= 8) {
            bitno = 0;
            --bp;
          }
        }

        return value >>> 0;
      } finally {
        cursor[CURMEMB_BP] = bp;
        cursor[CURMEMB_BITNO] = bitno;
      }
    }

    function Impl_AcDecInit(bytes, ac_ctx, bec) {
      var st_low = 0;

      for (var i = 0; i < 3; ++i) {
        st_low <<= 8;
        st_low |= bytes[i];
      }

      ac_ctx[ACCTXMEMB_LOW] = st_low >>> 0;
      ac_ctx[ACCTXMEMB_RANGE] = 0x00ffffff;
      ac_ctx[ACCTXMEMB_BEC] = bec;
      ac_ctx[ACCTXMEMB_BP] = 3;
    }

    function Impl_AcDecode(bytes, ac_ctx, cum_freqs, sym_freqs, numsym) {
      var st_low = ac_ctx[ACCTXMEMB_LOW];
      var st_range = ac_ctx[ACCTXMEMB_RANGE];
      var bp = ac_ctx[ACCTXMEMB_BP];
      var bec = ac_ctx[ACCTXMEMB_BEC];

      try {
        var tmp = st_range >>> 10;

        if (st_low >= tmp << 10 >>> 0) {
          bec.mark();
          return 0;
        }

        var val = numsym - 1;

        while (st_low < tmp * cum_freqs[val]) {
          --val;
        }

        st_low -= tmp * cum_freqs[val];
        st_range = tmp * sym_freqs[val];

        while (st_range < 0x10000) {
          st_low <<= 8;
          st_low |= bytes[bp];
          st_low = (st_low & 0x00ffffff) >>> 0;
          st_range = st_range << 8 >>> 0;
          ++bp;
        }

        return val;
      } finally {
        ac_ctx[ACCTXMEMB_LOW] = st_low;
        ac_ctx[ACCTXMEMB_RANGE] = st_range;
        ac_ctx[ACCTXMEMB_BP] = bp;
      }
    }

    module.exports = {
      "LC3Decoder": LC3Decoder
    };
  },
  "lc3/decoder/ld-mdct": function lc3DecoderLdMdct(module, require) {
    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3TblW = require("./../tables/w");

    var Lc3TblZ = require("./../tables/z");

    var Lc3Mdct = require("./../math/mdct");

    var IMDCT = Lc3Mdct.IMDCT;
    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var W_FLIPPED_TBL = Lc3TblW.W_FLIPPED_TBL;
    var Z_TBL = Lc3TblZ.Z_TBL;

    function LC3MDCTSynthesizer(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var W_FLIPPED = W_FLIPPED_TBL[index_Nms][index_Fs];
      var Z = Z_TBL[index_Nms][index_Fs];
      var NFaddZ = NF + Z;
      var NFsubZ = NF - Z;
      var NFmul2 = NF << 1 >>> 0;
      var mem_ola_add = new Array(NFsubZ);

      for (var n = 0; n < NFsubZ; ++n) {
        mem_ola_add[n] = 0;
      }

      var x_hat = new Array(NF);
      var t_hat = new Array(NFmul2);
      var imdct = new IMDCT(NF, Math.sqrt(NFmul2), W_FLIPPED);

      this.update = function (X_hat) {
        imdct.transform(X_hat, t_hat);

        for (var _n2 = 0, k = Z; _n2 < NFsubZ; ++_n2, ++k) {
          x_hat[_n2] = mem_ola_add[_n2] + t_hat[k];
        }

        for (var _n3 = NFsubZ, _k15 = NF; _n3 < NF; ++_n3, ++_k15) {
          x_hat[_n3] = t_hat[_k15];
        }

        for (var _n4 = 0, _k16 = NFaddZ; _n4 < NFsubZ; ++_n4, ++_k16) {
          mem_ola_add[_n4] = t_hat[_k16];
        }

        return x_hat;
      };
    }

    module.exports = {
      "LC3MDCTSynthesizer": LC3MDCTSynthesizer
    };
  },
  "lc3/decoder/ltpf": function lc3DecoderLtpf(module, require) {
    var Lc3Fs = require("./../common/fs");

    var Lc3LtpfCommon = require("./../common/ltpf-common");

    var Lc3Nms = require("./../common/nms");

    var Lc3SlideWin = require("./../common/slide_window");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3TblLtpf = require("./../tables/ltpf");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3SlideWindow = Lc3SlideWin.LC3SlideWindow;
    var GetGainParameters = Lc3LtpfCommon.GetGainParameters;
    var TAB_LTPF_NUM_8000 = Lc3TblLtpf.TAB_LTPF_NUM_8000;
    var TAB_LTPF_NUM_16000 = Lc3TblLtpf.TAB_LTPF_NUM_16000;
    var TAB_LTPF_NUM_24000 = Lc3TblLtpf.TAB_LTPF_NUM_24000;
    var TAB_LTPF_NUM_32000 = Lc3TblLtpf.TAB_LTPF_NUM_32000;
    var TAB_LTPF_NUM_48000 = Lc3TblLtpf.TAB_LTPF_NUM_48000;
    var TAB_LTPF_DEN_8000 = Lc3TblLtpf.TAB_LTPF_DEN_8000;
    var TAB_LTPF_DEN_16000 = Lc3TblLtpf.TAB_LTPF_DEN_16000;
    var TAB_LTPF_DEN_24000 = Lc3TblLtpf.TAB_LTPF_DEN_24000;
    var TAB_LTPF_DEN_32000 = Lc3TblLtpf.TAB_LTPF_DEN_32000;
    var TAB_LTPF_DEN_48000 = Lc3TblLtpf.TAB_LTPF_DEN_48000;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var NORM_TBL = [20, 40, 60, 80, 120, 120];
    var PITCHFS_FACTOR = [0.625, 1.25, 1.875, 2.5, 3.75, 3.75];
    var LDEN_TBL = [4, 4, 6, 8, 12, 12];
    var TAB_LTPF_NUM_TBL = [TAB_LTPF_NUM_8000, TAB_LTPF_NUM_16000, TAB_LTPF_NUM_24000, TAB_LTPF_NUM_32000, TAB_LTPF_NUM_48000, TAB_LTPF_NUM_48000];
    var TAB_LTPF_DEN_TBL = [TAB_LTPF_DEN_8000, TAB_LTPF_DEN_16000, TAB_LTPF_DEN_24000, TAB_LTPF_DEN_32000, TAB_LTPF_DEN_48000, TAB_LTPF_DEN_48000];
    var X_LTPF_HAT_WIN_HISTORY_SIZE = [[300, 300, 300, 320, 480, 480], [300, 300, 360, 480, 720, 720]];

    function LC3LongTermPostfilterDecoder(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var norm = NORM_TBL[index_Fs];
      var pitch_fs_factor = PITCHFS_FACTOR[index_Fs];
      var L_den = LDEN_TBL[index_Fs];
      var L_den_div2 = L_den >>> 1;
      var L_num = L_den - 2;
      var tab_ltpf_num_fs = TAB_LTPF_NUM_TBL[index_Fs];
      var tab_ltpf_den_fs = TAB_LTPF_DEN_TBL[index_Fs];
      var gain_params = new Array(2);
      var x_ltpf_hat = new Array(NF);
      var C_den_mem = new Array(L_den + 1);
      var C_den = new Array(L_den + 1);

      for (var k = 0; k <= L_den; ++k) {
        C_den_mem[k] = C_den[k] = 0;
      }

      var C_num_mem = new Array(L_num + 1);
      var C_num = new Array(L_num + 1);

      for (var _k17 = 0; _k17 <= L_num; ++_k17) {
        C_num_mem[_k17] = C_num[_k17] = 0;
      }

      var x_hat_win = new LC3SlideWindow(NF, L_num, 0);
      var x_ltpf_hat_win = new LC3SlideWindow(NF, X_LTPF_HAT_WIN_HISTORY_SIZE[index_Nms][index_Fs], 0);
      var x_ltpf_hat_emptyframe = new Array(NF);

      for (var _k18 = 0; _k18 < NF; ++_k18) {
        x_ltpf_hat_emptyframe[_k18] = 0;
      }

      var x_ltpf_hat_tmpbuf = new Array(L_num + norm);
      var mem_ltpf_active = 0;
      var p_int_mem = 0,
          p_fr_mem = 0;
      var vec = new Array(Math.max(L_num, L_den) + 1);

      this.update = function (x_hat, ltpf_active, pitch_index, nbits) {
        x_hat_win.append(x_hat);
        x_ltpf_hat_win.append(x_ltpf_hat_emptyframe);
        var p_int = 0,
            p_fr = 0;

        if (ltpf_active == 1) {
          GetGainParameters(Nms, Fs, nbits, gain_params);
          var gain_ltpf = gain_params[0];
          var gain_ind = gain_params[1];
          var pitch_int;

          if (pitch_index < 380) {
            pitch_int = (pitch_index >>> 2) + 32;
          } else if (pitch_index < 440) {
            pitch_int = (pitch_index >>> 1) - 63;
          } else {
            pitch_int = pitch_index - 283;
          }

          var pitch_fr;

          if (pitch_index < 380) {
            pitch_fr = pitch_index - (pitch_int << 2 >>> 0) + 128;
          } else if (pitch_index < 440) {
            pitch_fr = (pitch_index << 1 >>> 0) - (pitch_int << 2 >>> 0) - 252;
          } else {
            pitch_fr = 0;
          }

          var pitch = pitch_int + pitch_fr * 0.25;
          var pitch_fs = pitch * pitch_fs_factor;
          var p_up = Math.round(pitch_fs * 4);
          p_int = p_up >>> 2;
          p_fr = (p_up & 3) >>> 0;

          for (var _k19 = 0; _k19 <= L_num; ++_k19) {
            C_num[_k19] = 0.85 * gain_ltpf * tab_ltpf_num_fs[gain_ind][_k19];
          }

          for (var _k20 = 0; _k20 <= L_den; ++_k20) {
            C_den[_k20] = gain_ltpf * tab_ltpf_den_fs[p_fr][_k20];
          }
        } else {
          for (var _k21 = 0; _k21 <= L_den; ++_k21) {
            C_den[_k21] = 0;
          }

          for (var _k22 = 0; _k22 <= L_num; ++_k22) {
            C_num[_k22] = 0;
          }
        }

        if (ltpf_active == 0 && mem_ltpf_active == 0) {
          x_ltpf_hat_win.bulkSet(x_hat, 0, 0, norm);
        } else if (ltpf_active == 1 && mem_ltpf_active == 0) {
          x_ltpf_hat_win.set(0, x_hat[0]);

          for (var n = 1; n < norm; ++n) {
            var tmp = 0;
            x_hat_win.bulkGet(vec, 0, n - L_num, L_num + 1);

            for (var _k23 = 0; _k23 <= L_num; ++_k23) {
              tmp += C_num[_k23] * vec[L_num - _k23];
            }

            x_ltpf_hat_win.bulkGet(vec, 0, n - p_int - L_den_div2, L_den + 1);

            for (var _k24 = 0; _k24 <= L_den; ++_k24) {
              tmp -= C_den[_k24] * vec[L_den - _k24];
            }

            tmp = x_hat[n] - tmp * n / norm;
            x_ltpf_hat_win.set(n, tmp);
          }
        } else if (ltpf_active == 0 && mem_ltpf_active == 1) {
          for (var _n5 = 0; _n5 < norm; ++_n5) {
            var _tmp3 = 0;
            x_hat_win.bulkGet(vec, 0, _n5 - L_num, L_num + 1);

            for (var _k25 = 0; _k25 <= L_num; ++_k25) {
              _tmp3 += C_num_mem[_k25] * vec[L_num - _k25];
            }

            x_ltpf_hat_win.bulkGet(vec, 0, _n5 - p_int_mem - L_den_div2, L_den + 1);

            for (var _k26 = 0; _k26 <= L_den; ++_k26) {
              _tmp3 -= C_den_mem[_k26] * vec[L_den - _k26];
            }

            _tmp3 = x_hat[_n5] - _tmp3 * (1 - _n5 / norm);
            x_ltpf_hat_win.set(_n5, _tmp3);
          }
        } else {
          if (p_int == p_int_mem && p_fr == p_fr_mem) {
            for (var _n6 = 0; _n6 < norm; ++_n6) {
              var _tmp4 = x_hat[_n6];
              x_hat_win.bulkGet(vec, 0, _n6 - L_num, L_num + 1);

              for (var _k27 = 0; _k27 <= L_num; ++_k27) {
                _tmp4 -= C_num[_k27] * vec[L_num - _k27];
              }

              x_ltpf_hat_win.bulkGet(vec, 0, _n6 - p_int - L_den_div2, L_den + 1);

              for (var _k28 = 0; _k28 <= L_den; ++_k28) {
                _tmp4 += C_den[_k28] * vec[L_den - _k28];
              }

              x_ltpf_hat_win.set(_n6, _tmp4);
            }
          } else {
            for (var _n7 = 0; _n7 < norm; ++_n7) {
              var _tmp5 = 0;
              x_hat_win.bulkGet(vec, 0, _n7 - L_num, L_num + 1);

              for (var _k29 = 0; _k29 <= L_num; ++_k29) {
                _tmp5 += C_num_mem[_k29] * vec[L_num - _k29];
              }

              x_ltpf_hat_win.bulkGet(vec, 0, _n7 - p_int_mem - L_den_div2, L_den + 1);

              for (var _k30 = 0; _k30 <= L_den; ++_k30) {
                _tmp5 -= C_den_mem[_k30] * vec[L_den - _k30];
              }

              _tmp5 = x_hat[_n7] - _tmp5 * (1 - _n7 / norm);
              x_ltpf_hat_win.set(_n7, _tmp5);
            }

            x_ltpf_hat_win.bulkGet(x_ltpf_hat_tmpbuf, 0, -L_num, x_ltpf_hat_tmpbuf.length);
            x_ltpf_hat_win.set(0, x_ltpf_hat_tmpbuf[L_num]);

            for (var _n8 = 1; _n8 < norm; ++_n8) {
              var _tmp6 = 0;

              for (var k1 = 0, k2 = _n8 + L_num; k1 <= L_num; ++k1, --k2) {
                _tmp6 += C_num[k1] * x_ltpf_hat_tmpbuf[k2];
              }

              x_ltpf_hat_win.bulkGet(vec, 0, _n8 - p_int - L_den_div2, L_den + 1);

              for (var _k31 = 0; _k31 <= L_den; ++_k31) {
                _tmp6 -= C_den[_k31] * vec[L_den - _k31];
              }

              _tmp6 = x_ltpf_hat_tmpbuf[_n8 + L_num] - _tmp6 * _n8 / norm;
              x_ltpf_hat_win.set(_n8, _tmp6);
            }
          }
        }

        if (ltpf_active == 0) {
          x_ltpf_hat_win.bulkSet(x_hat, norm, norm, NF - norm);
        } else {
          for (var _n9 = norm; _n9 < NF; ++_n9) {
            var _tmp7 = x_hat[_n9];
            x_hat_win.bulkGet(vec, 0, _n9 - L_num, L_num + 1);

            for (var _k32 = 0; _k32 <= L_num; ++_k32) {
              _tmp7 -= C_num[_k32] * vec[L_num - _k32];
            }

            x_ltpf_hat_win.bulkGet(vec, 0, _n9 - p_int - L_den_div2, L_den + 1);

            for (var _k33 = 0; _k33 <= L_den; ++_k33) {
              _tmp7 += C_den[_k33] * vec[L_den - _k33];
            }

            x_ltpf_hat_win.set(_n9, _tmp7);
          }
        }

        x_ltpf_hat_win.bulkGet(x_ltpf_hat, 0, 0, NF);
        mem_ltpf_active = ltpf_active;
        p_int_mem = p_int;
        p_fr_mem = p_fr;
        {
          var _tmp8 = C_den;
          C_den = C_den_mem;
          C_den_mem = _tmp8;
        }
        {
          var _tmp9 = C_num;
          C_num = C_num_mem;
          C_num_mem = _tmp9;
        }
        return x_ltpf_hat;
      };
    }

    module.exports = {
      "LC3LongTermPostfilterDecoder": LC3LongTermPostfilterDecoder
    };
  },
  "lc3/decoder/plc": function lc3DecoderPlc(module, require) {
    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3TblNF = require("./../tables/nf");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var NF_TBL = Lc3TblNF.NF_TBL;

    function LC3PacketLossConcealment(Nms, Fs) {
      var index_Fs = Fs.getInternalIndex();
      var index_Nms = Nms.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var plc_seed = 24607;
      var alpha = 1;
      var nbLostCmpt = 0;
      var X_lastgood = new Array(NF);
      var X_plc = new Array(NF);

      for (var k = 0; k < NF; ++k) {
        X_lastgood[k] = 0;
        X_plc[k] = 0;
      }

      this.good = function (X_hat) {
        nbLostCmpt = 0;

        for (var _k34 = 0; _k34 < NF; ++_k34) {
          X_lastgood[_k34] = X_hat[_k34];
        }

        alpha = 1;
      };

      this.conceal = function () {
        if (nbLostCmpt < 16) {
          ++nbLostCmpt;
        }

        if (nbLostCmpt >= 8) {
          alpha *= 0.85;
        } else if (nbLostCmpt >= 4) {
          alpha *= 0.9;
        } else {}

        for (var _k35 = 0; _k35 < NF; ++_k35) {
          plc_seed = (16831 + plc_seed * 12821 & 0xFFFF) >>> 0;

          if (plc_seed < 0x8000) {
            X_plc[_k35] = X_lastgood[_k35] * alpha;
          } else {
            X_plc[_k35] = -X_lastgood[_k35] * alpha;
          }
        }

        return X_plc;
      };
    }

    module.exports = {
      "LC3PacketLossConcealment": LC3PacketLossConcealment
    };
  },
  "lc3/decoder/sns": function lc3DecoderSns(module, require) {
    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3TblI = require("./../tables/i");

    var Lc3TblNB = require("./../tables/nb");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3TblSns = require("./../tables/sns");

    var Lc3Pvq = require("./../math/pvq");

    var Lc3Mpvq = require("./../math/mpvq");

    var Lc3Error = require("./../error");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var MPVQ = Lc3Mpvq.MPVQ;
    var LC3BugError = Lc3Error.LC3BugError;
    var PVQNormalize = Lc3Pvq.PVQNormalize;
    var NB_TBL = Lc3TblNB.NB_TBL;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var I_TBL = Lc3TblI.I_TBL;
    var DCTII_16x16 = Lc3TblSns.DCTII_16x16;
    var HFCB = Lc3TblSns.HFCB;
    var LFCB = Lc3TblSns.LFCB;
    var GIJ = Lc3TblSns.GIJ;
    var MPVQ_16x10 = new MPVQ(16, 10);

    function LC3SpectralNoiseShapingDecoder(Nms, Fs) {
      var index_Fs = Fs.getInternalIndex();
      var index_Nms = Nms.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var NB = NB_TBL[index_Nms][index_Fs];
      var Ifs = I_TBL[index_Nms][index_Fs];
      var st1 = new Array(16);
      var mpvq_buf_x6 = new Array(6);
      var mpvq_buf_x10 = new Array(10);
      var xq_shape_j = new Array(16);
      var y_shape_j = new Array(16);
      var scfQ = new Array(16);
      var scfQint = new Array(64);
      var scfQint_tmp = new Array(64);
      var gsns = new Array(64);
      var X_hat = new Array(NF);

      this.update = function (ind_LF, ind_HF, shape_j, gain_i, LS_indA, idxA, LS_indB, idxB, Xs_hat) {
        {
          var codebook;
          codebook = LFCB[ind_LF];
          st1[0] = codebook[0];
          st1[1] = codebook[1];
          st1[2] = codebook[2];
          st1[3] = codebook[3];
          st1[4] = codebook[4];
          st1[5] = codebook[5];
          st1[6] = codebook[6];
          st1[7] = codebook[7];
          codebook = HFCB[ind_HF];
          st1[8] = codebook[0];
          st1[9] = codebook[1];
          st1[10] = codebook[2];
          st1[11] = codebook[3];
          st1[12] = codebook[4];
          st1[13] = codebook[5];
          st1[14] = codebook[6];
          st1[15] = codebook[7];
        }
        {
          switch (shape_j) {
            case 0:
              try {
                MPVQ_16x10.deenumerate(10, 10, LS_indA, idxA, mpvq_buf_x10);
                MPVQ_16x10.deenumerate(6, 1, LS_indB, idxB, mpvq_buf_x6);
              } catch (error) {
                return false;
              }

              y_shape_j[0] = mpvq_buf_x10[0];
              y_shape_j[1] = mpvq_buf_x10[1];
              y_shape_j[2] = mpvq_buf_x10[2];
              y_shape_j[3] = mpvq_buf_x10[3];
              y_shape_j[4] = mpvq_buf_x10[4];
              y_shape_j[5] = mpvq_buf_x10[5];
              y_shape_j[6] = mpvq_buf_x10[6];
              y_shape_j[7] = mpvq_buf_x10[7];
              y_shape_j[8] = mpvq_buf_x10[8];
              y_shape_j[9] = mpvq_buf_x10[9];
              y_shape_j[10] = mpvq_buf_x6[0];
              y_shape_j[11] = mpvq_buf_x6[1];
              y_shape_j[12] = mpvq_buf_x6[2];
              y_shape_j[13] = mpvq_buf_x6[3];
              y_shape_j[14] = mpvq_buf_x6[4];
              y_shape_j[15] = mpvq_buf_x6[5];
              break;

            case 1:
              try {
                MPVQ_16x10.deenumerate(10, 10, LS_indA, idxA, mpvq_buf_x10);
              } catch (error) {
                return false;
              }

              y_shape_j[0] = mpvq_buf_x10[0];
              y_shape_j[1] = mpvq_buf_x10[1];
              y_shape_j[2] = mpvq_buf_x10[2];
              y_shape_j[3] = mpvq_buf_x10[3];
              y_shape_j[4] = mpvq_buf_x10[4];
              y_shape_j[5] = mpvq_buf_x10[5];
              y_shape_j[6] = mpvq_buf_x10[6];
              y_shape_j[7] = mpvq_buf_x10[7];
              y_shape_j[8] = mpvq_buf_x10[8];
              y_shape_j[9] = mpvq_buf_x10[9];
              y_shape_j[10] = 0;
              y_shape_j[11] = 0;
              y_shape_j[12] = 0;
              y_shape_j[13] = 0;
              y_shape_j[14] = 0;
              y_shape_j[15] = 0;
              break;

            case 2:
              try {
                MPVQ_16x10.deenumerate(16, 8, LS_indA, idxA, y_shape_j);
              } catch (error) {
                return false;
              }

              break;

            case 3:
              try {
                MPVQ_16x10.deenumerate(16, 6, LS_indA, idxA, y_shape_j);
              } catch (error) {
                return false;
              }

              break;

            default:
              throw new LC3BugError("Bad shape_j.");
          }
        }
        {
          PVQNormalize(y_shape_j, xq_shape_j);
        }
        {
          var G = GIJ[shape_j][gain_i];

          for (var n = 0; n < 16; ++n) {
            var tmp = 0;

            for (var col = 0; col < 16; ++col) {
              tmp += xq_shape_j[col] * DCTII_16x16[n][col];
            }

            scfQ[n] = st1[n] + G * tmp;
          }
        }
        {
          var t1, t2;
          scfQint[0] = scfQ[0];
          scfQint[1] = scfQ[0];
          t1 = scfQ[0];
          t2 = (scfQ[1] - t1) / 8;
          scfQint[2] = t1 + t2;
          scfQint[3] = t1 + 3 * t2;
          scfQint[4] = t1 + 5 * t2;
          scfQint[5] = t1 + 7 * t2;
          t1 = scfQ[1];
          t2 = (scfQ[2] - t1) / 8;
          scfQint[6] = t1 + t2;
          scfQint[7] = t1 + 3 * t2;
          scfQint[8] = t1 + 5 * t2;
          scfQint[9] = t1 + 7 * t2;
          t1 = scfQ[2];
          t2 = (scfQ[3] - t1) / 8;
          scfQint[10] = t1 + t2;
          scfQint[11] = t1 + 3 * t2;
          scfQint[12] = t1 + 5 * t2;
          scfQint[13] = t1 + 7 * t2;
          t1 = scfQ[3];
          t2 = (scfQ[4] - t1) / 8;
          scfQint[14] = t1 + t2;
          scfQint[15] = t1 + 3 * t2;
          scfQint[16] = t1 + 5 * t2;
          scfQint[17] = t1 + 7 * t2;
          t1 = scfQ[4];
          t2 = (scfQ[5] - t1) / 8;
          scfQint[18] = t1 + t2;
          scfQint[19] = t1 + 3 * t2;
          scfQint[20] = t1 + 5 * t2;
          scfQint[21] = t1 + 7 * t2;
          t1 = scfQ[5];
          t2 = (scfQ[6] - t1) / 8;
          scfQint[22] = t1 + t2;
          scfQint[23] = t1 + 3 * t2;
          scfQint[24] = t1 + 5 * t2;
          scfQint[25] = t1 + 7 * t2;
          t1 = scfQ[6];
          t2 = (scfQ[7] - t1) / 8;
          scfQint[26] = t1 + t2;
          scfQint[27] = t1 + 3 * t2;
          scfQint[28] = t1 + 5 * t2;
          scfQint[29] = t1 + 7 * t2;
          t1 = scfQ[7];
          t2 = (scfQ[8] - t1) / 8;
          scfQint[30] = t1 + t2;
          scfQint[31] = t1 + 3 * t2;
          scfQint[32] = t1 + 5 * t2;
          scfQint[33] = t1 + 7 * t2;
          t1 = scfQ[8];
          t2 = (scfQ[9] - t1) / 8;
          scfQint[34] = t1 + t2;
          scfQint[35] = t1 + 3 * t2;
          scfQint[36] = t1 + 5 * t2;
          scfQint[37] = t1 + 7 * t2;
          t1 = scfQ[9];
          t2 = (scfQ[10] - t1) / 8;
          scfQint[38] = t1 + t2;
          scfQint[39] = t1 + 3 * t2;
          scfQint[40] = t1 + 5 * t2;
          scfQint[41] = t1 + 7 * t2;
          t1 = scfQ[10];
          t2 = (scfQ[11] - t1) / 8;
          scfQint[42] = t1 + t2;
          scfQint[43] = t1 + 3 * t2;
          scfQint[44] = t1 + 5 * t2;
          scfQint[45] = t1 + 7 * t2;
          t1 = scfQ[11];
          t2 = (scfQ[12] - t1) / 8;
          scfQint[46] = t1 + t2;
          scfQint[47] = t1 + 3 * t2;
          scfQint[48] = t1 + 5 * t2;
          scfQint[49] = t1 + 7 * t2;
          t1 = scfQ[12];
          t2 = (scfQ[13] - t1) / 8;
          scfQint[50] = t1 + t2;
          scfQint[51] = t1 + 3 * t2;
          scfQint[52] = t1 + 5 * t2;
          scfQint[53] = t1 + 7 * t2;
          t1 = scfQ[13];
          t2 = (scfQ[14] - t1) / 8;
          scfQint[54] = t1 + t2;
          scfQint[55] = t1 + 3 * t2;
          scfQint[56] = t1 + 5 * t2;
          scfQint[57] = t1 + 7 * t2;
          t1 = scfQ[14];
          t2 = (scfQ[15] - t1) / 8;
          scfQint[58] = t1 + t2;
          scfQint[59] = t1 + 3 * t2;
          scfQint[60] = t1 + 5 * t2;
          scfQint[61] = t1 + 7 * t2;
          t1 = scfQ[15];
          scfQint[62] = t1 + t2;
          scfQint[63] = t1 + 3 * t2;
        }
        var scfQint_use;
        {
          if (NB < 64) {
            var i = 0,
                iEnd = 64 - NB,
                j = 0;

            for (; i < iEnd; ++i, j += 2) {
              scfQint_tmp[i] = 0.5 * (scfQint[j] + scfQint[j + 1]);
            }

            for (; i < NB; ++i) {
              scfQint_tmp[i] = scfQint[iEnd + i];
            }

            scfQint_use = scfQint_tmp;
          } else {
            scfQint_use = scfQint;
          }
        }
        {
          for (var b = 0; b < NB; ++b) {
            gsns[b] = Math.pow(2, scfQint_use[b]);
          }

          for (var _b = NB; _b < 64; ++_b) {
            gsns[_b] = 0;
          }
        }
        {
          for (var k = 0; k < NF; ++k) {
            X_hat[k] = 0;
          }

          for (var _b2 = 0; _b2 < NB; ++_b2) {
            var gsns_b = gsns[_b2];

            for (var _k36 = Ifs[_b2], kEnd = Ifs[_b2 + 1]; _k36 < kEnd; ++_k36) {
              X_hat[_k36] = Xs_hat[_k36] * gsns_b;
            }
          }
        }
        return true;
      };

      this.getSpectrumCoefficients = function () {
        return X_hat;
      };
    }

    module.exports = {
      "LC3SpectralNoiseShapingDecoder": LC3SpectralNoiseShapingDecoder
    };
  },
  "lc3/encoder/attack-detector": function lc3EncoderAttackDetector(module, require) {
    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var ATK_TESTCOND_LOW = [[0, 0, 0, 81, 100, 100], [0, 0, 0, 61, 75, 75]];
    var ATK_TESTCOND_HIGH = [[0, 0, 0, 401, 401, 401], [0, 0, 0, 150, 150, 150]];
    var MF_TBL = [160, 120];
    var NBLOCKS_TBL = [4, 3];
    var NFDIVMF_TBL = [0, 1, 1, 2, 3, 3];

    function LC3AttackDetector(Nms, Fs) {
      var index_Fs = Fs.getInternalIndex();
      var index_Nms = Nms.getInternalIndex();
      var Mf = MF_TBL[index_Nms];
      var NfDivMf = NFDIVMF_TBL[index_Fs];
      var Nblocks = NBLOCKS_TBL[index_Nms];
      var Tatt = Nblocks >>> 1;
      var tclow = ATK_TESTCOND_LOW[index_Nms][index_Fs];
      var tchigh = ATK_TESTCOND_HIGH[index_Nms][index_Fs];
      var Fatt = 0;
      var Xatt_n1 = 0,
          Xatt_n2 = 0;
      var Aatt_blkN1 = 0;
      var Eatt_blkN1 = 0;
      var Patt_N1 = -1;

      this.update = function (xs, nbytes) {
        if (nbytes < tclow || nbytes >= tchigh) {
          Fatt = 0;
          return;
        }

        var blk = 0;
        var Eatt_blk = 0;
        var Eatt_cnt = 0;
        var Patt = -1;

        for (var n = 0; n < Mf; ++n) {
          var offset = NfDivMf * n;
          var Xatt_n = 0;

          for (var m = 0; m < NfDivMf; ++m) {
            Xatt_n += xs[offset + m];
          }

          var Xhp_n = 0.375 * Xatt_n - 0.5 * Xatt_n1 + 0.125 * Xatt_n2;
          Xatt_n2 = Xatt_n1;
          Xatt_n1 = Xatt_n;
          Eatt_blk += Xhp_n * Xhp_n;

          if (++Eatt_cnt >= 40) {
            var Aatt_blk = Math.max(0.25 * Aatt_blkN1, Eatt_blkN1);

            if (Eatt_blk > 8.5 * Aatt_blk) {
              Patt = blk;
            }

            ++blk;
            Aatt_blkN1 = Aatt_blk;
            Eatt_blkN1 = Eatt_blk;
            Eatt_blk = 0;
            Eatt_cnt = 0;
          }
        }

        if (Patt >= 0 || Patt_N1 >= Tatt) {
          Fatt = 1;
        } else {
          Fatt = 0;
        }

        Patt_N1 = Patt;
      };

      this.getAttackFlag = function () {
        return Fatt;
      };
    }

    module.exports = {
      "LC3AttackDetector": LC3AttackDetector
    };
  },
  "lc3/encoder/bw-detector": function lc3EncoderBwDetector(module, require) {
    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3TblBW = require("./../tables/bw");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var NBITSBW_TBL = Lc3TblBW.NBITSBW_TBL;
    var IBWSTART_TBL = [[[], [53], [47, 59], [44, 54, 60], [41, 51, 57, 61], [41, 51, 57, 61]], [[], [51], [45, 58], [42, 53, 60], [40, 51, 57, 61], [40, 51, 57, 61]]];
    var IBWSTOP_TBL = [[[], [63], [56, 63], [52, 59, 63], [49, 55, 60, 63], [49, 55, 60, 63]], [[], [63], [55, 63], [51, 58, 63], [48, 55, 60, 63], [48, 55, 60, 63]]];
    var NBW_TBL = [[0, 1, 2, 3, 4, 4], [0, 1, 2, 3, 4, 4]];
    var TQ = [20, 10, 10, 10];
    var TC = [15, 23, 20, 20];
    var L_TBL = [[4, 4, 3, 1], [4, 4, 3, 2]];

    function LC3BandwidthDetector(Nms, Fs) {
      var index_Fs = Fs.getInternalIndex();
      var index_Nms = Nms.getInternalIndex();
      var Nbw = null;
      var Ibwstart = null;
      var Ibwstop = null;
      var L = null;
      var nbitsbw = null;
      Nbw = NBW_TBL[index_Nms][index_Fs];
      Ibwstart = IBWSTART_TBL[index_Nms][index_Fs];
      Ibwstop = IBWSTOP_TBL[index_Nms][index_Fs];
      nbitsbw = NBITSBW_TBL[index_Nms][index_Fs];
      L = L_TBL[index_Nms];

      this.getBitConsumption = function () {
        return nbitsbw;
      };

      this.detect = function (EB) {
        var bw0 = 0;

        for (var k = Nbw - 1; k >= 0; --k) {
          var bwstart = Ibwstart[k];
          var bwstop = Ibwstop[k];
          var Esum = 0;

          for (var n = bwstart; n <= bwstop; ++n) {
            Esum += EB[n];
          }

          Esum /= bwstop - bwstart + 1;

          if (Esum >= TQ[k]) {
            bw0 = k + 1;
            break;
          }
        }

        var bw = bw0;

        if (bw != Nbw) {
          var Cmax = -Infinity;
          var Lbw0 = L[bw0];
          var n1 = Ibwstart[bw0] - Lbw0 + 1;
          var n2 = n1 + Lbw0;

          for (var _n10 = n1; _n10 <= n2; ++_n10) {
            var EB_n = EB[_n10];

            if (EB_n < 1e-31) {
              EB_n = 1e-31;
            }

            var C = Math.log10(1e-31 + EB[_n10 - Lbw0] / EB_n);

            if (C > Cmax) {
              Cmax = C;
            }
          }

          if (10 * Cmax <= TC[bw0]) {
            bw = Nbw;
          }
        }

        return bw;
      };
    }

    module.exports = {
      "LC3BandwidthDetector": LC3BandwidthDetector
    };
  },
  "lc3/encoder/encoder": function lc3EncoderEncoder(module, require) {
    var Lc3EcLdMdct = require("./ld-mdct");

    var Lc3EcBwDetector = require("./bw-detector");

    var Lc3EcAkDetector = require("./attack-detector");

    var Lc3EcSns = require("./sns");

    var Lc3EcSq = require("./sq");

    var Lc3EcTns = require("./tns");

    var Lc3EcLtpf = require("./ltpf");

    var Lc3EcNle = require("./nle");

    var Lc3TblAcSpec = require("./../tables/ac_spec");

    var Lc3TblNE = require("./../tables/ne");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3TblSns = require("./../tables/sns");

    var Lc3TblTns = require("./../tables/tns");

    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3Error = require("./../error");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var LC3MDCTAnalyzer = Lc3EcLdMdct.LC3MDCTAnalyzer;
    var LC3BandwidthDetector = Lc3EcBwDetector.LC3BandwidthDetector;
    var LC3AttackDetector = Lc3EcAkDetector.LC3AttackDetector;
    var LC3SpectralNoiseShapingEncoder = Lc3EcSns.LC3SpectralNoiseShapingEncoder;
    var LC3TemporalNoiseShapingEncoder = Lc3EcTns.LC3TemporalNoiseShapingEncoder;
    var LC3LongTermPostfilter = Lc3EcLtpf.LC3LongTermPostfilter;
    var LC3SpectralQuantization = Lc3EcSq.LC3SpectralQuantization;
    var LC3NoiseLevelEstimation = Lc3EcNle.LC3NoiseLevelEstimation;
    var AC_SPEC_LOOKUP = Lc3TblAcSpec.AC_SPEC_LOOKUP;
    var AC_SPEC_CUMFREQ = Lc3TblAcSpec.AC_SPEC_CUMFREQ;
    var AC_SPEC_FREQ = Lc3TblAcSpec.AC_SPEC_FREQ;
    var SNS_GAINLSBBITS = Lc3TblSns.SNS_GAINLSBBITS;
    var SNS_GAINMSBBITS = Lc3TblSns.SNS_GAINMSBBITS;
    var AC_TNS_ORDER_CUMFREQ = Lc3TblTns.AC_TNS_ORDER_CUMFREQ;
    var AC_TNS_ORDER_FREQ = Lc3TblTns.AC_TNS_ORDER_FREQ;
    var AC_TNS_COEF_CUMFREQ = Lc3TblTns.AC_TNS_COEF_CUMFREQ;
    var AC_TNS_COEF_FREQ = Lc3TblTns.AC_TNS_COEF_FREQ;
    var NE_TBL = Lc3TblNE.NE_TBL;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var CURMEMN = 2;
    var CURMEMB_BP = 0;
    var CURMEMB_BITNO = 1;
    var ACCTXMEMN = 6;
    var ACCTXMEMB_LOW = 0;
    var ACCTXMEMB_RANGE = 1;
    var ACCTXMEMB_CACHE = 2;
    var ACCTXMEMB_CARRY = 3;
    var ACCTXMEMB_CARRYCOUNT = 4;
    var ACCTXMEMB_BP = 5;

    function LC3Encoder(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var NE = NE_TBL[index_Nms][index_Fs];
      var NE_div_2 = NE >>> 1;
      var mdct = new LC3MDCTAnalyzer(Nms, Fs);
      var bwdet = new LC3BandwidthDetector(Nms, Fs);
      var akdet = new LC3AttackDetector(Nms, Fs);
      var sns = new LC3SpectralNoiseShapingEncoder(Nms, Fs);
      var sns_vqp_buf = new Array(6);
      var tns = new LC3TemporalNoiseShapingEncoder(Nms, Fs);
      var ltpf_enc = new LC3LongTermPostfilter(Nms, Fs);
      var ltpf_enc_param_buf = new Array(4);
      var sqtz = new LC3SpectralQuantization(Nms, Fs);
      var sqtz_param_buf = new Array(9);
      var res_bits = new Array(3200);
      var nle = new LC3NoiseLevelEstimation(Nms, Fs);
      var cur_side = new Array(CURMEMN);
      var ac_ctx = new Array(ACCTXMEMN);
      var lsbs = new Array(3200);
      var xs_clipped = new Array(NF);

      this.getFrameSize = function () {
        return NF;
      };

      this.encode = function (xs, nbytes) {
        var bytesbuf = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : NewDefaultByteBuffer(400);

        if (xs.length != NF) {
          throw new LC3IllegalParameterError("Frame size mismatches.");
        }

        if (nbytes < 20 || nbytes > 400) {
          throw new LC3IllegalParameterError("Byte count is not within specific range (20 <= nbytes <= 400).");
        }

        if (bytesbuf.length < nbytes) {
          throw new LC3IllegalParameterError("Length of the buffer (i.e. bytesbuf) is smaller than the " + "byte count.");
        }

        if (typeof Int16Array != "undefined" && xs instanceof Int16Array) {
          for (var n = 0; n < NF; ++n) {
            xs_clipped[n] = xs[n];
          }
        } else {
          for (var _n11 = 0; _n11 < NF; ++_n11) {
            var tmp = xs[_n11];

            if (tmp > 32767) {
              xs_clipped[_n11] = 32767;
            } else if (tmp < -32768) {
              xs_clipped[_n11] = -32768;
            } else {
              xs_clipped[_n11] = tmp;
            }
          }
        }

        var nbits = nbytes << 3 >>> 0;
        mdct.update(xs_clipped);
        var nn_flag = mdct.getNearNyquistFlag();
        var X = mdct.getSpectralCoefficients();
        var EB = mdct.getSpectralEnergyBandEstimation();
        var Pbw = bwdet.detect(EB);
        var nbitsBW = bwdet.getBitConsumption();
        akdet.update(xs_clipped, nbytes);
        var F_att = akdet.getAttackFlag();
        sns.update(EB, X, F_att);
        var Xs = sns.getShapedSpectrumCoefficients();
        sns.getVectorQuantizationParameters(sns_vqp_buf);
        var sns_ind_LF = sns_vqp_buf[0];
        var sns_ind_HF = sns_vqp_buf[1];
        var sns_gain_i = sns_vqp_buf[2];
        var sns_shape_j = sns_vqp_buf[3];
        var sns_indexjoint = sns_vqp_buf[4];
        var sns_LSindA = sns_vqp_buf[5];
        tns.update(Xs, Pbw, nn_flag, nbits);
        var nbitsTNS = tns.getBitConsumption();
        var num_tns_filters = tns.getRcCount();
        var tns_RCorder = tns.getRcOrders();
        var tns_RCi = tns.getRcIndices();
        var tns_lpc_weighting = tns.getLpcWeighting();
        var Xf = tns.getFilteredSpectrumCoefficients();
        ltpf_enc.update(xs_clipped, nbits, nn_flag);
        ltpf_enc.getEncoderParameters(ltpf_enc_param_buf);
        var nbitsLTPF = ltpf_enc_param_buf[0];
        var ltpf_pitch_present = ltpf_enc_param_buf[1];
        var ltpf_pitch_index = ltpf_enc_param_buf[3];
        var ltpf_active = ltpf_enc_param_buf[2];
        sqtz.update(Xf, nbits, nbitsBW, nbitsTNS, nbitsLTPF);
        var Xq = sqtz.getQuantizedSpectrumCoefficients();
        sqtz.getQuantizedParameters(sqtz_param_buf);
        var gg = sqtz_param_buf[0];
        var gg_ind = sqtz_param_buf[1];
        var lastnz_trunc = sqtz_param_buf[2];
        var rateFlag = sqtz_param_buf[3];
        var nbits_spec = sqtz_param_buf[5];
        var nbits_trunc = sqtz_param_buf[6];
        var nbits_lastnz = sqtz_param_buf[7];
        var lsbMode = sqtz_param_buf[8];
        var nbits_residual_max = nbits_spec - nbits_trunc + 4;
        var nbits_residual = 0;

        for (var k = 0; k < NE && nbits_residual < nbits_residual_max; ++k) {
          var Xq_k = Xq[k];

          if (Xq_k != 0) {
            res_bits[nbits_residual] = Xf[k] >= Xq_k * gg ? 1 : 0;
            ++nbits_residual;
          }
        }

        nle.update(Xf, Xq, Pbw, gg);
        var F_NF = nle.getNoiseLevel();
        var bitstream = bytesbuf;

        if (bitstream.length != nbytes) {
          bitstream = bitstream.slice(0, nbytes);
        }

        bitstream = bitstream.fill(0);
        cur_side[CURMEMB_BP] = nbytes - 1;
        cur_side[CURMEMB_BITNO] = 0;

        if (nbitsBW > 0) {
          Impl_WriteUIntBackward(bitstream, cur_side, Pbw, nbitsBW);
        }

        Impl_WriteUIntBackward(bitstream, cur_side, (lastnz_trunc >>> 1) - 1, nbits_lastnz);
        Impl_WriteBitBackward(bitstream, cur_side, lsbMode);
        Impl_WriteUIntBackward(bitstream, cur_side, gg_ind, 8);

        for (var f = 0; f < num_tns_filters; ++f) {
          var tns_active = void 0;

          if (tns_RCorder[f] > 0) {
            tns_active = 1;
          } else {
            tns_active = 0;
          }

          Impl_WriteBitBackward(bitstream, cur_side, tns_active);
        }

        Impl_WriteBitBackward(bitstream, cur_side, ltpf_pitch_present);
        Impl_WriteUIntBackward(bitstream, cur_side, sns_ind_LF, 5);
        Impl_WriteUIntBackward(bitstream, cur_side, sns_ind_HF, 5);
        Impl_WriteBitBackward(bitstream, cur_side, sns_shape_j >>> 1);
        var submode_MSB = sns_shape_j >>> 1;
        var gain_MSBs = sns_gain_i >>> SNS_GAINLSBBITS[sns_shape_j];
        Impl_WriteUIntBackward(bitstream, cur_side, gain_MSBs, SNS_GAINMSBBITS[sns_shape_j]);
        Impl_WriteBitBackward(bitstream, cur_side, sns_LSindA);

        if (submode_MSB == 0) {
          Impl_WriteUIntBackward(bitstream, cur_side, sns_indexjoint, 25);
        } else {
          Impl_WriteUIntBackward(bitstream, cur_side, sns_indexjoint, 24);
        }

        if (ltpf_pitch_present != 0) {
          Impl_WriteBitBackward(bitstream, cur_side, ltpf_active);
          Impl_WriteUIntBackward(bitstream, cur_side, ltpf_pitch_index, 9);
        }

        Impl_WriteUIntBackward(bitstream, cur_side, F_NF, 3);
        Impl_AcEncInit(ac_ctx);
        var c = 0;
        var nlsbs = 0;
        var lsb0 = 0,
            lsb1 = 0;

        for (var _f6 = 0; _f6 < num_tns_filters; ++_f6) {
          var tns_RCorder_fS1 = tns_RCorder[_f6] - 1;
          var tns_RCi_f = tns_RCi[_f6];

          if (tns_RCorder_fS1 >= 0) {
            Impl_AcEncode(bitstream, ac_ctx, AC_TNS_ORDER_CUMFREQ[tns_lpc_weighting][tns_RCorder_fS1], AC_TNS_ORDER_FREQ[tns_lpc_weighting][tns_RCorder_fS1]);

            for (var _k37 = 0; _k37 <= tns_RCorder_fS1; ++_k37) {
              var tns_RCi_f_k = tns_RCi_f[_k37];
              Impl_AcEncode(bitstream, ac_ctx, AC_TNS_COEF_CUMFREQ[_k37][tns_RCi_f_k], AC_TNS_COEF_FREQ[_k37][tns_RCi_f_k]);
            }
          }
        }

        for (var _k38 = 0; _k38 < lastnz_trunc; _k38 += 2) {
          var Xq_k0 = Xq[_k38];
          var Xq_k1 = Xq[_k38 + 1];
          var t = c + rateFlag;

          if (_k38 > NE_div_2) {
            t += 256;
          }

          var a = Math.abs(Xq_k0);
          var a_lsb = a;
          var b = Math.abs(Xq_k1);
          var b_lsb = b;
          var lev = 0;

          while (Math.max(a, b) >= 4) {
            var _pki = AC_SPEC_LOOKUP[t + (Math.min(lev, 3) << 10 >>> 0)];
            Impl_AcEncode(bitstream, ac_ctx, AC_SPEC_CUMFREQ[_pki][16], AC_SPEC_FREQ[_pki][16]);

            if (lsbMode == 1 && lev == 0) {
              lsb0 = (a & 1) >>> 0;
              lsb1 = (b & 1) >>> 0;
            } else {
              Impl_WriteBitBackward(bitstream, cur_side, (a & 1) >>> 0);
              Impl_WriteBitBackward(bitstream, cur_side, (b & 1) >>> 0);
            }

            a >>>= 1;
            b >>>= 1;
            ++lev;
          }

          var pki = AC_SPEC_LOOKUP[t + (Math.min(lev, 3) << 10 >>> 0)];
          var sym = a + (b << 2 >>> 0);
          Impl_AcEncode(bitstream, ac_ctx, AC_SPEC_CUMFREQ[pki][sym], AC_SPEC_FREQ[pki][sym]);

          if (lsbMode == 1 && lev > 0) {
            a_lsb >>>= 1;
            b_lsb >>>= 1;
            lsbs[nlsbs++] = lsb0;

            if (a_lsb == 0 && Xq_k0 != 0) {
              lsbs[nlsbs++] = Xq_k0 > 0 ? 0 : 1;
            }

            lsbs[nlsbs++] = lsb1;

            if (b_lsb == 0 && Xq_k1 != 0) {
              lsbs[nlsbs++] = Xq_k1 > 0 ? 0 : 1;
            }
          }

          if (a_lsb > 0) {
            Impl_WriteBitBackward(bitstream, cur_side, Xq_k0 > 0 ? 0 : 1);
          }

          if (b_lsb > 0) {
            Impl_WriteBitBackward(bitstream, cur_side, Xq_k1 > 0 ? 0 : 1);
          }

          lev = Math.min(lev, 3);

          if (lev <= 1) {
            t = 1 + (a + b) * (lev + 1);
          } else {
            t = 12 + lev;
          }

          c = ((c & 15) << 4 >>> 0) + t;
        }

        var nbits_side = nbits - (8 * cur_side[CURMEMB_BP] + 8 - cur_side[CURMEMB_BITNO]);
        var nbits_ari = (ac_ctx[ACCTXMEMB_BP] << 3 >>> 0) + 25 - Math.trunc(Math.log2(ac_ctx[ACCTXMEMB_RANGE]));

        if (ac_ctx[ACCTXMEMB_CACHE] >= 0) {
          nbits_ari += 8;
        }

        if (ac_ctx[ACCTXMEMB_CARRYCOUNT] > 0) {
          nbits_ari += ac_ctx[ACCTXMEMB_CARRYCOUNT] << 3 >>> 0;
        }

        var nbits_residual_enc = nbits - nbits_side - nbits_ari;

        if (lsbMode == 0) {
          if (nbits_residual < nbits_residual_enc) {
            nbits_residual_enc = nbits_residual;
          }

          for (var _k39 = 0; _k39 < nbits_residual_enc; ++_k39) {
            Impl_WriteBitBackward(bitstream, cur_side, res_bits[_k39]);
          }
        } else {
          if (nlsbs < nbits_residual_enc) {
            nbits_residual_enc = nlsbs;
          }

          for (var _k40 = 0; _k40 < nbits_residual_enc; ++_k40) {
            Impl_WriteBitBackward(bitstream, cur_side, lsbs[_k40]);
          }
        }

        Impl_AcEncFinish(bitstream, ac_ctx);
        return bitstream;
      };
    }

    function Impl_WriteBitBackward(bytes, cursor, bit) {
      var bp = cursor[CURMEMB_BP];
      var bitno = cursor[CURMEMB_BITNO];

      try {
        var mask = 1 << bitno >>> 0;
        var bv = bytes[bp];

        if (bit == 0) {
          bv &= 0xFF ^ mask;
        } else {
          bv |= mask;
        }

        bytes[bp] = bv >>> 0;

        if (bitno == 7) {
          bitno = 0;
          --bp;
        } else {
          ++bitno;
        }
      } finally {
        cursor[CURMEMB_BP] = bp;
        cursor[CURMEMB_BITNO] = bitno;
      }
    }

    function Impl_WriteUIntBackward(bytes, cursor, val, numbits) {
      var bp = cursor[CURMEMB_BP];
      var bitno = cursor[CURMEMB_BITNO];

      try {
        while (numbits != 0) {
          var bitrem = 8 - bitno;
          var bitncopy = Math.min(bitrem, numbits);
          var bv = bytes[bp];
          var m = (1 << bitncopy >>> 0) - 1;
          bv &= m << bitno ^ 0xFF;
          bv |= (val & m) << bitno;
          bytes[bp] = bv >>> 0;
          val >>>= bitncopy;
          numbits -= bitncopy;
          bitno += bitncopy;

          if (bitno >= 8) {
            bitno = 0;
            --bp;
          }
        }
      } finally {
        cursor[CURMEMB_BP] = bp;
        cursor[CURMEMB_BITNO] = bitno;
      }
    }

    function Impl_AcEncInit(ctx) {
      ctx[ACCTXMEMB_LOW] = 0;
      ctx[ACCTXMEMB_RANGE] = 0x00ffffff;
      ctx[ACCTXMEMB_CACHE] = -1;
      ctx[ACCTXMEMB_CARRY] = 0;
      ctx[ACCTXMEMB_CARRYCOUNT] = 0;
      ctx[ACCTXMEMB_BP] = 0;
    }

    function Impl_AcEncode(bytes, ctx, cum_freq, sym_freq) {
      var st_low = ctx[ACCTXMEMB_LOW];
      var st_range = ctx[ACCTXMEMB_RANGE];
      var st_cache = ctx[ACCTXMEMB_CACHE];
      var st_carry = ctx[ACCTXMEMB_CARRY];
      var st_carrycount = ctx[ACCTXMEMB_CARRYCOUNT];
      var bp = ctx[ACCTXMEMB_BP];

      try {
        var r = st_range >>> 10;
        st_low += r * cum_freq;

        if (st_low >>> 24 != 0) {
          st_carry = 1;
          st_low = (st_low & 0x00ffffff) >>> 0;
        }

        st_range = r * sym_freq;

        while (st_range < 0x10000) {
          st_range = st_range << 8 >>> 0;

          if (st_low < 0x00ff0000 || st_carry == 1) {
            if (st_cache >= 0) {
              bytes[bp] = st_cache + st_carry;
              ++bp;
            }

            while (st_carrycount > 0) {
              bytes[bp] = (st_carry + 0xff & 0xff) >>> 0;
              ++bp;
              --st_carrycount;
            }

            st_cache = st_low >>> 16;
            st_carry = 0;
          } else {
            ++st_carrycount;
          }

          st_low = (st_low << 8 & 0x00ffffff) >>> 0;
        }
      } finally {
        ctx[ACCTXMEMB_LOW] = st_low;
        ctx[ACCTXMEMB_RANGE] = st_range;
        ctx[ACCTXMEMB_CACHE] = st_cache;
        ctx[ACCTXMEMB_CARRY] = st_carry;
        ctx[ACCTXMEMB_CARRYCOUNT] = st_carrycount;
        ctx[ACCTXMEMB_BP] = bp;
      }
    }

    function Impl_AcEncFinish(bytes, ctx) {
      var st_low = ctx[ACCTXMEMB_LOW];
      var st_range = ctx[ACCTXMEMB_RANGE];
      var st_cache = ctx[ACCTXMEMB_CACHE];
      var st_carry = ctx[ACCTXMEMB_CARRY];
      var st_carrycount = ctx[ACCTXMEMB_CARRYCOUNT];
      var bp = ctx[ACCTXMEMB_BP];

      try {
        var bits = 1;

        while (st_range >>> 24 - bits == 0) {
          ++bits;
        }

        var mask = 0x00ffffff >>> bits;
        var val = st_low + mask;
        var over1 = val >>> 24;
        var high = st_low + st_range;
        var over2 = high >>> 24;
        high = (high & 0x00ffffff) >>> 0;
        val = (val & 0x00ffffff & (0xffffffff ^ mask)) >>> 0;

        if (over1 == over2) {
          if (val + mask >= high) {
            ++bits;
            mask >>>= 1;
            val = (st_low + mask & 0x00ffffff & (0xffffffff ^ mask)) >>> 0;
          }

          if (val < st_low) {
            st_carry = 1;
          }
        }

        st_low = val;

        for (; bits > 0; bits -= 8) {
          if (st_low < 0x00ff0000 || st_carry == 1) {
            if (st_cache >= 0) {
              bytes[bp] = st_cache + st_carry;
              ++bp;
            }

            while (st_carrycount > 0) {
              bytes[bp] = (st_carry + 0xff & 0xff) >>> 0;
              ++bp;
              --st_carrycount;
            }

            st_cache = st_low >>> 16;
            st_carry = 0;
          } else {
            ++st_carrycount;
          }

          st_low = (st_low << 8 & 0x00ffffff) >>> 0;
        }

        bits += 8;
        var lastbyte;

        if (st_carrycount > 0) {
          bytes[bp] = st_cache;
          ++bp;

          for (; st_carrycount > 1; --st_carrycount) {
            bytes[bp] = 0xff;
            ++bp;
          }

          lastbyte = 0xff >>> 8 - bits;
        } else {
          lastbyte = st_cache;
        }

        var m1 = 0xff >>> bits;
        var m2 = (0xff ^ m1) >>> 0;
        var bv = bytes[bp];
        bv = (bv & m1 | lastbyte & m2) >>> 0;
        bytes[bp] = bv;
      } finally {
        ctx[ACCTXMEMB_LOW] = st_low;
        ctx[ACCTXMEMB_RANGE] = st_range;
        ctx[ACCTXMEMB_CACHE] = st_cache;
        ctx[ACCTXMEMB_CARRY] = st_carry;
        ctx[ACCTXMEMB_CARRYCOUNT] = st_carrycount;
        ctx[ACCTXMEMB_BP] = bp;
      }
    }

    var NewDefaultByteBuffer = function () {
      if (typeof Buffer != "undefined") {
        return function (sz) {
          return Buffer.allocUnsafe(sz);
        };
      } else if (typeof Uint8Array != "undefined") {
        return function (sz) {
          return new Uint8Array(sz);
        };
      } else {
        return function (sz) {
          return new Array(sz);
        };
      }
    }();

    module.exports = {
      "LC3Encoder": LC3Encoder
    };
  },
  "lc3/encoder/ld-mdct": function lc3EncoderLdMdct(module, require) {
    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3SlideWin = require("./../common/slide_window");

    var Lc3Mdct = require("./../math/mdct");

    var Lc3TblI = require("./../tables/i");

    var Lc3TblNB = require("./../tables/nb");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3TblNnIdx = require("./../tables/nnidx");

    var Lc3TblW = require("./../tables/w");

    var Lc3TblZ = require("./../tables/z");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3SlideWindow = Lc3SlideWin.LC3SlideWindow;
    var MDCT = Lc3Mdct.MDCT;
    var I_TBL = Lc3TblI.I_TBL;
    var NB_TBL = Lc3TblNB.NB_TBL;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var NNIDX_TBL = Lc3TblNnIdx.NNIDX_TBL;
    var W_TBL = Lc3TblW.W_TBL;
    var Z_TBL = Lc3TblZ.Z_TBL;
    var NN_thresh = 30;

    function LC3MDCTAnalyzer(Nms, Fs) {
      var index_Fs = Fs.getInternalIndex();
      var index_Nms = Nms.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var NF_mul_2 = NF << 1 >>> 0;
      var NB = NB_TBL[index_Nms][index_Fs];
      var Z = Z_TBL[index_Nms][index_Fs];
      var W = W_TBL[index_Nms][index_Fs];
      var Ifs = I_TBL[index_Nms][index_Fs];
      var nn_idx = NNIDX_TBL[index_Nms][index_Fs];
      var mdct = new MDCT(NF, Math.sqrt(2 / NF), W);
      var TbufLen = NF_mul_2 - Z;
      var Tbuf = new LC3SlideWindow(TbufLen, 0, 0);
      var Twinbuf = new Array(NF_mul_2);

      for (var k = 1; k <= Z; ++k) {
        Twinbuf[NF_mul_2 - k] = 0;
      }

      var X = new Array(NF);

      for (var _k41 = 0; _k41 < NF; ++_k41) {
        X[_k41] = 0;
      }

      var EB = new Array(NB);

      for (var b = 0; b < NB; ++b) {
        EB[b] = 0;
      }

      var nn_flag = 0;

      this.update = function (xs) {
        Tbuf.append(xs);
        Tbuf.bulkGet(Twinbuf, 0, 0, TbufLen);
        mdct.transform(Twinbuf, X);

        for (var _b3 = 0; _b3 < NB; ++_b3) {
          var i1 = Ifs[_b3];
          var i2 = Ifs[_b3 + 1];
          var EB_b = 0;

          for (var _k42 = i1; _k42 < i2; ++_k42) {
            var Xs_k = X[_k42];
            EB_b += Xs_k * Xs_k;
          }

          EB_b /= i2 - i1;
          EB[_b3] = EB_b;
        }

        var nn_high = 0,
            nn_low = 0;

        for (var n = nn_idx; n < NB; ++n) {
          nn_high += EB[n];
        }

        for (var _n12 = 0; _n12 < nn_idx; ++_n12) {
          nn_low += EB[_n12];
        }

        if (nn_high > NN_thresh * nn_low) {
          nn_flag = 1;
        } else {
          nn_flag = 0;
        }
      };

      this.getSpectralCoefficients = function () {
        return X;
      };

      this.getSpectralEnergyBandEstimation = function () {
        return EB;
      };

      this.getNearNyquistFlag = function () {
        return nn_flag;
      };
    }

    module.exports = {
      "LC3MDCTAnalyzer": LC3MDCTAnalyzer
    };
  },
  "lc3/encoder/ltpf": function lc3EncoderLtpf(module, require) {
    var Lc3Nms = require("./../common/nms");

    var Lc3Fs = require("./../common/fs");

    var Lc3IntUtil = require("./../common/int_util");

    var Lc3SlideWin = require("./../common/slide_window");

    var Lc3LtpfCommon = require("./../common/ltpf-common");

    var Lc3Fft = require("./../math/fft");

    var Lc3TblLtpf = require("./../tables/ltpf");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3Error = require("./../error");

    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3SlideWindow = Lc3SlideWin.LC3SlideWindow;
    var FFT = Lc3Fft.FFT;
    var GetGainParameters = Lc3LtpfCommon.GetGainParameters;
    var IntDiv = Lc3IntUtil.IntDiv;
    var FindBestCorrelationSize = Lc3Fft.FindBestCorrelationSize;
    var TAB_RESAMP_FILTER = Lc3TblLtpf.TAB_RESAMP_FILTER;
    var TAB_LTPF_INTERP_R = Lc3TblLtpf.TAB_LTPF_INTERP_R;
    var TAB_LTPF_INTERP_X12K8 = Lc3TblLtpf.TAB_LTPF_INTERP_X12K8;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var FS_TO_P = [24, 12, 8, 6, 4, 4];
    var FS_TO_120DIVP = [5, 10, 15, 20, 30, 30];
    var NMS_TO_LEN12P8 = [128, 96];
    var NMS_TO_DLTPF = [24, 44];
    var NMS_TO_CORRLEN = [64, 48];
    var H50_A1 = +1.9652933726226904;
    var H50_A2 = -0.9658854605688177;
    var H50_B0 = +0.9827947082978771;
    var H50_B1 = -1.965589416595754;
    var H50_B2 = +0.9827947082978771;
    var KMIN = 17;
    var KMAX = 114;
    var KWIDTH = KMAX - KMIN + 1;
    var KCOEF = [+1.000000000000000, +0.994845360824742, +0.989690721649485, +0.984536082474227, +0.979381443298969, +0.974226804123711, +0.969072164948454, +0.963917525773196, +0.958762886597938, +0.953608247422680, +0.948453608247423, +0.943298969072165, +0.938144329896907, +0.932989690721650, +0.927835051546392, +0.922680412371134, +0.917525773195876, +0.912371134020619, +0.907216494845361, +0.902061855670103, +0.896907216494845, +0.891752577319588, +0.886597938144330, +0.881443298969072, +0.876288659793814, +0.871134020618557, +0.865979381443299, +0.860824742268041, +0.855670103092784, +0.850515463917526, +0.845360824742268, +0.840206185567010, +0.835051546391753, +0.829896907216495, +0.824742268041237, +0.819587628865979, +0.814432989690722, +0.809278350515464, +0.804123711340206, +0.798969072164949, +0.793814432989691, +0.788659793814433, +0.783505154639175, +0.778350515463918, +0.773195876288660, +0.768041237113402, +0.762886597938144, +0.757731958762887, +0.752577319587629, +0.747422680412371, +0.742268041237113, +0.737113402061856, +0.731958762886598, +0.726804123711340, +0.721649484536082, +0.716494845360825, +0.711340206185567, +0.706185567010309, +0.701030927835051, +0.695876288659794, +0.690721649484536, +0.685567010309278, +0.680412371134021, +0.675257731958763, +0.670103092783505, +0.664948453608248, +0.659793814432990, +0.654639175257732, +0.649484536082474, +0.644329896907216, +0.639175257731959, +0.634020618556701, +0.628865979381443, +0.623711340206186, +0.618556701030928, +0.613402061855670, +0.608247422680412, +0.603092783505155, +0.597938144329897, +0.592783505154639, +0.587628865979381, +0.582474226804124, +0.577319587628866, +0.572164948453608, +0.567010309278350, +0.561855670103093, +0.556701030927835, +0.551546391752577, +0.546391752577320, +0.541237113402062, +0.536082474226804, +0.530927835051546, +0.525773195876289, +0.520618556701031, +0.515463917525773, +0.510309278350515, +0.505154639175258, +0.500000000000000];
    var RESFACS = [0.5, 1, 1, 1, 1, 1];

    function LC3LongTermPostfilter(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var len12p8 = NMS_TO_LEN12P8[index_Nms];
      var len6p4 = len12p8 >>> 1;
      var D_LTPF = NMS_TO_DLTPF[index_Nms];
      var P = FS_TO_P[index_Fs];
      var P_120Div = FS_TO_120DIVP[index_Fs];
      var resfac = RESFACS[index_Fs];
      var reslen = (P_120Div << 1 >>> 0) + 1;
      var gain_params = new Array(2);
      var xs_win = new LC3SlideWindow(NF, NF, 0);
      var x12p8D_win = new LC3SlideWindow(D_LTPF + len12p8, 300, 0);
      var x6p4_win = new LC3SlideWindow(len6p4, 150, 0);
      var h50_z1 = 0;
      var h50_z2 = 0;
      var buf_12p8 = new Array(len12p8);
      var buf_6p4 = new Array(len6p4);
      var buf_downsamp = new Array(5);
      var buf_resamp = new Array(reslen);
      var R6p4_corrfft_size = FindBestCorrelationSize(KWIDTH + len6p4 - 1);
      var R6p4_corrfft = new FFT(R6p4_corrfft_size);
      var R6p4_corrfft_c0 = KWIDTH - 1;
      var R6p4_corrfft_c1 = R6p4_corrfft_size - R6p4_corrfft_c0;
      var R6p4_corrfft_c2 = -KMIN;
      var R6p4_corrfft_c3 = 1 - KWIDTH - KMIN;
      var R6p4_corrwin1_re = new Array(R6p4_corrfft_size);
      var R6p4_corrwin1_im = new Array(R6p4_corrfft_size);
      var R6p4_corrwin2_re = new Array(R6p4_corrfft_size);
      var R6p4_corrwin2_im = new Array(R6p4_corrfft_size);
      var R12p8 = new Array(17);
      var R12p8_buf1 = new Array(len12p8);
      var R12p8_buf2 = new Array(len12p8 + 17);
      var Tprev = KMIN;
      var Tcurr = KMIN;
      var corrlen = NMS_TO_CORRLEN[index_Nms];
      var corrbuf1 = new Array(corrlen);
      var corrbuf2 = new Array(corrlen);
      var corrbuf3 = new Array(corrlen);
      var xi_bufsz = len12p8 + 5;
      var xi_buf1 = new Array(xi_bufsz);
      var xi_buf2 = new Array(xi_bufsz);
      var pitch_present = 0;
      var pitch_int = 0;
      var pitch_fr = 0;
      var nbitsLTPF = 0;
      var pitch_index = 0;
      var nc_ltpf = 0;
      var mem_nc_ltpf = 0;
      var mem_mem_nc_ltpf = 0;
      var ltpf_active = 0;
      var mem_ltpf_active = 0;
      var pitch = 0;
      var mem_pitch = 0;

      this.update = function (xs, nbits, nn_flag) {
        xs_win.append(xs);
        {
          var t0 = resfac * P;

          for (var n = 0, n_mul_15 = 0; n < len12p8; ++n, n_mul_15 += 15) {
            var t1 = n_mul_15 % P;
            var t2 = IntDiv(n_mul_15, P);
            var t3 = 0;
            xs_win.bulkGet(buf_resamp, 0, t2 - 2 * P_120Div, reslen);

            for (var k = 0, tab_off = -120 - t1; k < reslen; ++k, tab_off += P) {
              var tab_coeff = void 0;

              if (tab_off > -120 && tab_off < 120) {
                tab_coeff = TAB_RESAMP_FILTER[tab_off + 119];
              } else {
                tab_coeff = 0;
              }

              t3 += buf_resamp[k] * tab_coeff;
            }

            buf_12p8[n] = t3 * t0;
          }
        }
        {
          for (var _n13 = 0; _n13 < len12p8; ++_n13) {
            var w = buf_12p8[_n13] + h50_z1 * H50_A1 + h50_z2 * H50_A2;
            var y = w * H50_B0 + h50_z1 * H50_B1 + h50_z2 * H50_B2;
            h50_z2 = h50_z1;
            h50_z1 = w;
            buf_12p8[_n13] = y;
          }
        }
        {
          x12p8D_win.append(buf_12p8);
        }
        {
          for (var _n14 = 0, off = -3; _n14 < len6p4; ++_n14, off += 2) {
            x12p8D_win.bulkGet(buf_downsamp, 0, off, 5);
            buf_6p4[_n14] = 0.1236796411180537 * buf_downsamp[0] + 0.2353512128364889 * buf_downsamp[1] + 0.2819382920909148 * buf_downsamp[2] + 0.2353512128364889 * buf_downsamp[3] + 0.1236796411180537 * buf_downsamp[4];
          }

          x6p4_win.append(buf_6p4);
        }
        var R6p4;
        {
          x6p4_win.bulkGet(R6p4_corrwin1_re, 0, 0, len6p4);
          x6p4_win.bulkGet(R6p4_corrwin2_re, 0, R6p4_corrfft_c2, len6p4);
          x6p4_win.bulkGet(R6p4_corrwin2_re, R6p4_corrfft_c1, R6p4_corrfft_c3, R6p4_corrfft_c0);

          for (var _n15 = 0; _n15 < len6p4; ++_n15) {
            R6p4_corrwin1_im[_n15] = 0;
            R6p4_corrwin2_im[_n15] = 0;
          }

          for (var _n16 = len6p4; _n16 < R6p4_corrfft_c1; ++_n16) {
            R6p4_corrwin1_re[_n16] = 0;
            R6p4_corrwin1_im[_n16] = 0;
            R6p4_corrwin2_re[_n16] = 0;
            R6p4_corrwin2_im[_n16] = 0;
          }

          for (var _n17 = R6p4_corrfft_c1; _n17 < R6p4_corrfft_size; ++_n17) {
            R6p4_corrwin1_re[_n17] = 0;
            R6p4_corrwin1_im[_n17] = 0;
            R6p4_corrwin2_im[_n17] = 0;
          }

          R6p4_corrfft.transform(R6p4_corrwin1_re, R6p4_corrwin1_im);
          R6p4_corrfft.transform(R6p4_corrwin2_re, R6p4_corrwin2_im);

          for (var _k43 = 0; _k43 < R6p4_corrfft_size; ++_k43) {
            var a_re = R6p4_corrwin1_re[_k43],
                a_im = -R6p4_corrwin1_im[_k43];
            var b_re = R6p4_corrwin2_re[_k43],
                b_im = R6p4_corrwin2_im[_k43];
            R6p4_corrwin1_re[_k43] = (a_re * b_re - a_im * b_im) / R6p4_corrfft_size;
            R6p4_corrwin1_im[_k43] = (a_re * b_im + a_im * b_re) / R6p4_corrfft_size;
          }

          R6p4_corrfft.transform(R6p4_corrwin1_re, R6p4_corrwin1_im);
          R6p4 = R6p4_corrwin1_re;
        }
        {
          for (var _k44 = 0; _k44 < KWIDTH; ++_k44) {
            R6p4[_k44] *= KCOEF[_k44];
          }
        }
        var T1 = 0;
        {
          var T1max = -Infinity;

          for (var _k45 = 0; _k45 < KWIDTH; ++_k45) {
            var tmp = R6p4[_k45];

            if (tmp > T1max) {
              T1max = tmp;
              T1 = KMIN + _k45;
            }
          }
        }
        var T2 = 0;
        {
          var T2kmin = Math.max(KMIN, Tprev - 4),
              T2kmax = Math.min(KMAX, Tprev + 4),
              T2max = -Infinity;

          for (var _k46 = T2kmin; _k46 <= T2kmax; ++_k46) {
            var _tmp10 = R6p4[_k46 - KMIN];

            if (_tmp10 > T2max) {
              T2max = _tmp10;
              T2 = _k46;
            }
          }
        }
        var normcorr = 0;
        {
          var T1norm_numer = 0,
              T1norm_denom = 0;
          var T2norm_numer = 0,
              T2norm_denom = 0;
          var T1norm_denom1 = 0,
              T1norm_denom2 = 0;
          var T2norm_denom1 = 0,
              T2norm_denom2 = 0;
          x6p4_win.bulkGet(corrbuf1, 0, 0, corrlen);
          x6p4_win.bulkGet(corrbuf2, 0, -T1, corrlen);
          x6p4_win.bulkGet(corrbuf3, 0, -T2, corrlen);

          for (var _n18 = 0; _n18 < corrlen; ++_n18) {
            var c1 = corrbuf1[_n18];
            var c2 = corrbuf2[_n18];
            T1norm_numer += c1 * c2;
            T1norm_denom1 += c1 * c1;
            T1norm_denom2 += c2 * c2;
            c2 = corrbuf3[_n18];
            T2norm_numer += c1 * c2;
            T2norm_denom1 += c1 * c1;
            T2norm_denom2 += c2 * c2;
          }

          if (T1norm_numer < 0) {
            T1norm_numer = 0;
            T1norm_denom = 1;
          } else {
            T1norm_denom = Math.sqrt(T1norm_denom1 * T1norm_denom2);

            if (T1norm_denom < 1e-31) {
              T1norm_denom = 1e-31;
            }
          }

          if (T2norm_numer < 0) {
            T2norm_numer = 0;
            T2norm_denom = 1;
          } else {
            T2norm_denom = Math.sqrt(T2norm_denom1 * T2norm_denom2);

            if (T2norm_denom < 1e-31) {
              T2norm_denom = 1e-31;
            }
          }

          if (T2norm_numer * T1norm_denom <= 0.85 * T1norm_numer * T2norm_denom) {
            Tcurr = T1;
            normcorr = T1norm_numer / T1norm_denom;
          } else {
            Tcurr = T2;
            normcorr = T2norm_numer / T2norm_denom;
          }
        }
        {
          if (normcorr > 0.6) {
            pitch_present = 1;
            nbitsLTPF = 11;
            var kminII = Math.max(32, 2 * Tcurr - 4);
            var kmaxII = Math.min(228, 2 * Tcurr + 4);
            {
              var koff = kmaxII + 4;
              x12p8D_win.bulkGet(R12p8_buf1, 0, 0, len12p8);
              x12p8D_win.bulkGet(R12p8_buf2, 0, -koff, len12p8 + 17);

              for (var _k47 = kminII - 4, p = 0; _k47 <= koff; ++_k47, ++p) {
                var _tmp11 = 0;

                for (var _n19 = 0; _n19 < len12p8; ++_n19) {
                  _tmp11 += R12p8_buf1[_n19] * R12p8_buf2[koff + _n19 - _k47];
                }

                R12p8[p] = _tmp11;
              }

              var R12p8_max = -Infinity;

              for (var _k48 = kminII, _p = 4; _k48 <= kmaxII; ++_k48, ++_p) {
                var R12p8_p = R12p8[_p];

                if (R12p8_p > R12p8_max) {
                  pitch_int = _k48;
                  R12p8_max = R12p8_p;
                }
              }
            }
            {
              if (pitch_int >= 157) {
                pitch_fr = 0;
              } else {
                var dlow, dhigh, dstep;

                if (pitch_int >= 127 && pitch_int < 157) {
                  dlow = -2;
                  dhigh = 2;
                  dstep = 2;
                } else if (pitch_int > 32) {
                  dlow = -3;
                  dhigh = 3;
                  dstep = 1;
                } else {
                  dlow = 0;
                  dhigh = 3;
                  dstep = 1;
                }

                var interp_max = -Infinity;

                for (var d = dlow; d <= dhigh; d += dstep) {
                  var interp_d = 0;

                  for (var m = -4, i1 = pitch_int - kminII, i2 = -16 - d; m <= 4; ++m, ++i1, i2 += 4) {
                    var h4_coeff = void 0;

                    if (i2 > -16 && i2 < 16) {
                      h4_coeff = TAB_LTPF_INTERP_R[i2 + 15];
                    } else {
                      h4_coeff = 0;
                    }

                    interp_d += R12p8[i1] * h4_coeff;
                  }

                  if (interp_d > interp_max) {
                    interp_max = interp_d;
                    pitch_fr = d;
                  }
                }

                if (pitch_fr < 0) {
                  --pitch_int;
                  pitch_fr += 4;
                }
              }
            }
            {
              if (pitch_int >= 157) {
                pitch_index = pitch_int + 283;
              } else if (pitch_int >= 127) {
                pitch_index = 2 * pitch_int + (pitch_fr >>> 1) + 126;
              } else {
                pitch_index = 4 * pitch_int + pitch_fr - 128;
              }
            }
            {
              var nc_numer = 0,
                  nc_denom1 = 0,
                  nc_denom2 = 0;
              x12p8D_win.bulkGet(xi_buf1, 0, -2, xi_bufsz);
              x12p8D_win.bulkGet(xi_buf2, 0, -2 - pitch_int, xi_bufsz);

              for (var _n20 = 0; _n20 < len12p8; ++_n20) {
                var _t2 = 0;
                var _t3 = 0;

                for (var _k49 = 0, _p2 = -8; _k49 <= 4; ++_k49, _p2 += 4) {
                  var hi_coeff = void 0;

                  if (_p2 > -8 && _p2 < 8) {
                    hi_coeff = TAB_LTPF_INTERP_X12K8[_p2 + 7];
                  } else {
                    hi_coeff = 0;
                  }

                  var xi_off = _n20 - _k49 + 4;
                  _t2 += hi_coeff * xi_buf1[xi_off];
                  var p2 = _p2 - pitch_fr;

                  if (_p2 > -8 && _p2 < 8) {
                    hi_coeff = TAB_LTPF_INTERP_X12K8[p2 + 7];
                  } else {
                    hi_coeff = 0;
                  }

                  _t3 += hi_coeff * xi_buf2[xi_off];
                }

                nc_numer += _t2 * _t3;
                nc_denom1 += _t2 * _t2;
                nc_denom2 += _t3 * _t3;
              }

              nc_denom1 = Math.sqrt(nc_denom1 * nc_denom2);

              if (nc_denom1 < 1e-31) {
                nc_denom1 = 1e-31;
              }

              nc_ltpf = nc_numer / nc_denom1;
            }
            pitch = pitch_int + pitch_fr / 4;
            GetGainParameters(Nms, Fs, nbits, gain_params);
            var gain_ltpf = gain_params[0];
            {
              if (nn_flag == 0 && gain_ltpf >= 1e-31) {
                var us = Nms.toMicroseconds();

                if (mem_ltpf_active == 0 && (us == 10000 || mem_mem_nc_ltpf > 0.94) && mem_nc_ltpf > 0.94 && nc_ltpf > 0.94 || mem_ltpf_active == 1 && nc_ltpf > 0.9 || mem_ltpf_active == 1 && Math.abs(pitch - mem_pitch) < 2 && nc_ltpf - mem_nc_ltpf > -0.1 && nc_ltpf > 0.84) {
                  ltpf_active = 1;
                } else {
                  ltpf_active = 0;
                }
              } else {
                ltpf_active = 0;
              }
            }
          } else {
            pitch_present = 0;
            nbitsLTPF = 1;
            pitch_int = 0;
            pitch_fr = 0;
            pitch_index = 0;
            pitch = 0;
            nc_ltpf = 0;
            ltpf_active = 0;
          }
        }
        Tprev = Tcurr;
        mem_mem_nc_ltpf = mem_nc_ltpf;
        mem_nc_ltpf = nc_ltpf;
        mem_ltpf_active = ltpf_active;
        mem_pitch = pitch;
      };

      this.getEncoderParameters = function () {
        var R = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Array(4);

        if (R.length != 4) {
          throw new LC3IllegalParameterError("R has an incorrect size (!= 4).");
        }

        R[0] = nbitsLTPF;
        R[1] = pitch_present;
        R[2] = ltpf_active;
        R[3] = pitch_index;
        return R;
      };
    }

    module.exports = {
      "LC3LongTermPostfilter": LC3LongTermPostfilter
    };
  },
  "lc3/encoder/nle": function lc3EncoderNle(module, require) {
    var Lc3Nms = require("./../common/nms");

    var Lc3Fs = require("./../common/fs");

    var Lc3TblNE = require("./../tables/ne");

    var Lc3TblNLE = require("./../tables/nle");

    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var NE_TBL = Lc3TblNE.NE_TBL;
    var NFSTART_TBL = Lc3TblNLE.NFSTART_TBL;
    var NFWIDTH_TBL = Lc3TblNLE.NFWIDTH_TBL;
    var BW_STOP_TBL = Lc3TblNLE.BW_STOP_TBL;

    function LC3NoiseLevelEstimation(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var NE = NE_TBL[index_Nms][index_Fs];
      var bw_stop_Nms = BW_STOP_TBL[index_Nms];
      var NFstart = NFSTART_TBL[index_Nms];
      var NFwidth = NFWIDTH_TBL[index_Nms];
      var F_NF = 0;

      this.update = function (Xf, Xq, Pbw, gg) {
        var bw_stop = bw_stop_Nms[Pbw];
        var LNF_numer = 0,
            LNF_denom = 0;

        for (var k = 0; k < NE; ++k) {
          if (k >= NFstart && k < bw_stop) {
            var INF_flag = true;

            for (var i = k - NFwidth, iEnd = Math.min(bw_stop - 1, k + NFwidth); i <= iEnd; ++i) {
              if (Xq[i] != 0) {
                INF_flag = false;
                break;
              }
            }

            if (INF_flag) {
              LNF_numer += Math.abs(Xf[k]) / gg;
              ++LNF_denom;
            }
          }
        }

        if (LNF_denom == 0) {
          LNF_numer = 0;
          LNF_denom = 1;
        }

        F_NF = Math.round(8 - 16 * (LNF_numer / LNF_denom));

        if (F_NF < 0) {
          F_NF = 0;
        } else if (F_NF > 7) {
          F_NF = 7;
        }
      };

      this.getNoiseLevel = function () {
        return F_NF;
      };
    }

    module.exports = {
      "LC3NoiseLevelEstimation": LC3NoiseLevelEstimation
    };
  },
  "lc3/encoder/sns": function lc3EncoderSns(module, require) {
    var Lc3Nms = require("./../common/nms");

    var Lc3Fs = require("./../common/fs");

    var Lc3TblIfs = require("./../tables/i");

    var Lc3TblNB = require("./../tables/nb");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3TblSns = require("./../tables/sns");

    var Lc3Pvq = require("./../math/pvq");

    var Lc3Mpvq = require("./../math/mpvq");

    var Lc3Error = require("./../error");

    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3BugError = Lc3Error.LC3BugError;
    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var MPVQ = Lc3Mpvq.MPVQ;
    var PVQSearch = Lc3Pvq.PVQSearch;
    var PVQNormalize = Lc3Pvq.PVQNormalize;
    var I_TBL = Lc3TblIfs.I_TBL;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var NB_TBL = Lc3TblNB.NB_TBL;
    var DCTII_16x16 = Lc3TblSns.DCTII_16x16;
    var HFCB = Lc3TblSns.HFCB;
    var LFCB = Lc3TblSns.LFCB;
    var GIJ = Lc3TblSns.GIJ;
    var PEFACTORS = [[1.00000000000000000000, 1.05250028527773298315, 1.10775685050970906786, 1.16591440117983169422, 1.22712523985119004166, 1.29154966501488388531, 1.35935639087852555562, 1.43072298919375762161, 1.50583635427984052768, 1.58489319246111359796, 1.66810053720005879718, 1.75567629127500124397, 1.84784979742229094057, 1.94486243893736210353, 2.04696827180752105590, 2.15443469003188381450, 2.26754312587080164576, 2.38658978685858080837, 2.51188643150958013095, 2.64376118574909968473, 2.78255940220712449928, 2.92864456462523659042, 3.08239923974514340443, 3.24422607917162997282, 3.41454887383360183861, 3.59381366380462763388, 3.78248990638938398234, 3.98107170553497224930, 4.19007910578666908918, 4.41005945417673750342, 4.64158883361277840862, 4.88527357151938890212, 5.14175182768392602384, 5.41169526546463597327, 5.69581081073768658030, 5.99484250318941036539, 6.30957344480193338399, 6.64082785063484148935, 6.98947320727348486713, 7.35642254459641353748, 7.74263682681126930163, 8.14912746902074225375, 8.57695898590894145741, 9.02725177948457613297, 9.50118507318143556972, 10.0000000000000000000, 10.5250028527773267228, 11.0775685050970924550, 11.6591440117983182745, 12.2712523985118977521, 12.9154966501488406294, 13.5935639087852564444, 14.3072298919375722193, 15.0583635427984070532, 15.8489319246111328710, 16.6810053720005910805, 17.5567629127500133279, 18.4784979742229076294, 19.4486243893736272526, 20.4696827180752123354, 21.5443469003188354804, 22.6754312587080200103, 23.8658978685858080837, 25.1188643150957950922], [1.00000000000000000000, 1.06800043251457577043, 1.14062492385132085992, 1.21818791201011555891, 1.30102521691083139466, 1.38949549437313768507, 1.48398178896756505196, 1.58489319246111359796, 1.69266661503787574361, 1.80776867696343424008, 1.93069772888325008608, 2.06198600950221999639, 2.20220194998737550662, 2.35195263507095875255, 2.51188643150958013095, 2.68269579527972545918, 2.86512026966378074988, 3.05994968720719562327, 3.26802758941012516658, 3.49025487895957997608, 3.72759372031493985133, 3.98107170553497224930, 4.25178630338289043067, 4.54090961097247625133, 4.84969342852819806922, 5.17947467923121074307, 5.53168119761722731909, 5.90783791158794535647, 6.30957344480193338399, 6.73862716803094663476, 7.19685673001151915429, 7.68624610039773781267, 8.20891415963825465951, 8.76712387296868200792, 9.36329208823941527839, 10.0000000000000000000, 10.6800043251457541515, 11.4062492385132081552, 12.1818791201011542569, 13.0102521691083161670, 13.8949549437313741862, 14.8398178896756540723, 15.8489319246111328710, 16.9266661503787609888, 18.0776867696343401803, 19.3069772888325061899, 20.6198600950222044048, 22.0220194998737461844, 23.5195263507095901900, 25.1188643150957950922, 26.8269579527972581445, 28.6512026966378030579, 30.5994968720719597854, 32.6802758941012498894, 34.9025487895958121953, 37.2759372031493967370, 39.8107170553497340393, 42.5178630338289025303, 45.4090961097247713951, 48.4969342852819806922, 51.7947467923120967725, 55.3168119761722749672, 59.0783791158794358012, 63.0957344480193285108], [1.00000000000000000000, 1.08372885005948838000, 1.17446822045126086920, 1.27280509398105845520, 1.37937560084995136656, 1.49486913370923346633, 1.62003280726413101398, 1.75567629127500124397, 1.90267704822016447963, 2.06198600950221999639, 2.23463372691659412084, 2.42173703917546934150, 2.62450629661210133037, 2.84425319080131844274, 3.08239923974514340443, 3.34048498351324507638, 3.62017994982379764934, 3.92329345403096008127, 4.25178630338289043067, 4.60778348126382208960, 4.99358789347314768747, 5.41169526546463597327, 5.86481028691436812039, 6.35586410805476553776, 6.88803330095656640708, 7.46476040841712062957, 8.08977621338348207303, 8.76712387296868200792, 9.50118507318143556972, 10.2967083735612927597, 11.1588399250774870097, 12.0931567600021274700, 13.1057028691062349424, 14.2030282995578325256, 15.3922315264421811776, 16.6810053720005910805, 18.0776867696343401803, 19.5913106945914563539, 21.2316686102077483156, 23.0093718077845785785, 24.9359200498415845004, 27.0237759607901608661, 29.2864456462523570224, 31.7385660625427838966, 34.3959997014965992435, 37.2759372031493967370, 40.3970085600588078023, 43.7794036326358195765, 47.4450027550866124670, 51.4175182768392531329, 55.7226479550717357370, 60.3882411906195670781, 65.4444791826251872635, 70.9240701673285229845, 76.8624610039773870085, 83.2980664765826759321, 90.2725177948457400134, 97.8309319017828897813, 106.022203330167243962, 114.899320495775356221, 124.519708473503314394, 134.945600473732440605, 146.244440421985132161, 158.489319246111421080], [1.00000000000000000000, 1.09968889964399152426, 1.20931567600021283582, 1.32987102506290399972, 1.46244440421985189005, 1.60823387766704151147, 1.76855694330185864160, 1.94486243893736210353, 2.13874363543395729081, 2.35195263507095875255, 2.58641620527596893808, 2.84425319080131844274, 3.12779366170121386759, 3.43959997014965868090, 3.78248990638938398234, 4.15956216307184689640, 4.57422433810926065689, 5.03022372910013793046, 5.53168119761722731909, 6.08312840938904564325, 6.68954878691414300818, 7.35642254459641353748, 8.08977621338348207303, 8.89623710246181609307, 9.78309319017828826759, 10.7583589854217898107, 11.8308479546535352256, 13.0102521691083161670, 14.3072298919375722193, 15.7335018968184563448, 17.3019573884589448198, 19.0267704822016376909, 20.9235282953511010362, 23.0093718077845785785, 25.3031507648020976831, 27.8255940220712432165, 30.5994968720719597854, 33.6499270449085656765, 37.0044512451160940714, 40.6933842716714622156, 44.7500629725044873908, 49.2111475092327950165, 54.1169526546463757199, 59.5118121168740401572, 65.4444791826251872635, 71.9685673001152110828, 79.1430345832182240429, 87.0327166153056310804, 95.7089123677127986412, 105.250028527773267228, 115.742288059205776563, 127.280509398105863283, 139.968963326129710367, 153.922315264421740721, 169.266661503787616994, 186.140668735512122112, 204.696827180751995456, 225.102828643017630839, 247.543081937189924702, 272.220379389990739583, 299.357729472049072683, 329.200372123041177019, 362.017994982379605062, 398.107170553497326182], [1.00000000000000000000, 1.11588399250774839011, 1.24519708473503287749, 1.38949549437313768507, 1.55051577983262456328, 1.73019573884589417112, 1.93069772888325008608, 2.15443469003188381450, 2.40409918350997164893, 2.68269579527972545918, 2.99357729472048994523, 3.34048498351324507638, 3.72759372031493985133, 4.15956216307184689640, 4.64158883361277840862, 5.17947467923121074307, 5.77969288415331305941, 6.44946677103762411321, 7.19685673001151915429, 8.03085722139151414467, 8.96150501946604549630, 10.0000000000000000000, 11.1588399250774870097, 12.4519708473503314394, 13.8949549437313741862, 15.5051577983262447447, 17.3019573884589448198, 19.3069772888325061899, 21.5443469003188354804, 24.0409918350997173775, 26.8269579527972581445, 29.9357729472049030051, 33.4048498351324454347, 37.2759372031493967370, 41.5956216307184689640, 46.4158883361277929680, 51.7947467923120967725, 57.7969288415331305941, 64.4946677103762340266, 71.9685673001152110828, 80.3085722139151272359, 89.6150501946604549630, 100.000000000000000000, 111.588399250774799043, 124.519708473503314394, 138.949549437313748967, 155.051577983262546923, 173.019573884589448198, 193.069772888324962423, 215.443469003188454280, 240.409918350997173775, 268.269579527972439337, 299.357729472049072683, 334.048498351324440137, 372.759372031494194744, 415.956216307184718062, 464.158883361277730728, 517.947467923121280364, 577.969288415331334363, 644.946677103761999206, 719.685673001152053985, 803.085722139151243937, 896.150501946605004377, 1000.00000000000000000], [1.00000000000000000000, 1.11588399250774839011, 1.24519708473503287749, 1.38949549437313768507, 1.55051577983262456328, 1.73019573884589417112, 1.93069772888325008608, 2.15443469003188381450, 2.40409918350997164893, 2.68269579527972545918, 2.99357729472048994523, 3.34048498351324507638, 3.72759372031493985133, 4.15956216307184689640, 4.64158883361277840862, 5.17947467923121074307, 5.77969288415331305941, 6.44946677103762411321, 7.19685673001151915429, 8.03085722139151414467, 8.96150501946604549630, 10.0000000000000000000, 11.1588399250774870097, 12.4519708473503314394, 13.8949549437313741862, 15.5051577983262447447, 17.3019573884589448198, 19.3069772888325061899, 21.5443469003188354804, 24.0409918350997173775, 26.8269579527972581445, 29.9357729472049030051, 33.4048498351324454347, 37.2759372031493967370, 41.5956216307184689640, 46.4158883361277929680, 51.7947467923120967725, 57.7969288415331305941, 64.4946677103762340266, 71.9685673001152110828, 80.3085722139151272359, 89.6150501946604549630, 100.000000000000000000, 111.588399250774799043, 124.519708473503314394, 138.949549437313748967, 155.051577983262546923, 173.019573884589448198, 193.069772888324962423, 215.443469003188454280, 240.409918350997173775, 268.269579527972439337, 299.357729472049072683, 334.048498351324440137, 372.759372031494194744, 415.956216307184718062, 464.158883361277730728, 517.947467923121280364, 577.969288415331334363, 644.946677103761999206, 719.685673001152053985, 803.085722139151243937, 896.150501946605004377, 1000.00000000000000000]];
    var FATT_TBL = [0.5, 0.3];
    var NSFLOOR_MIN = 2.3283064365386963e-10;
    var MPVQ_16x10 = new MPVQ(16, 10);

    function LC3SpectralNoiseShapingEncoder(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var Ifs = I_TBL[index_Nms][index_Fs];
      var NB = NB_TBL[index_Nms][index_Fs];
      var pefactors = PEFACTORS[index_Fs];
      var fatt = FATT_TBL[index_Nms];
      var EB2 = new Array(64);
      var E64 = new Array(64);
      var E4 = new Array(16);
      var scf0 = new Array(16);
      var scf1 = new Array(16);
      var t2rot = new Array(16);
      var t2rot_setA = new Array(10);
      var t2rot_setB = new Array(6);
      var pvq_cache_s = new Array(16);
      var sns_y0_setA = new Array(10);
      var sns_y0_setB = new Array(6);
      var sns_y0 = new Array(16);
      var sns_y1 = new Array(16);
      var sns_y2 = new Array(16);
      var sns_y3 = new Array(16);
      var sns_xq0 = new Array(16);
      var sns_xq1 = new Array(16);
      var sns_xq2 = new Array(16);
      var sns_xq3 = new Array(16);
      var sns_xq = [sns_xq0, sns_xq1, sns_xq2, sns_xq3];
      var mpvq_enum_cache = [0, 0];
      var ind_LF = -1;
      var ind_HF = -1;
      var st1 = new Array(16);
      var r1 = new Array(16);

      for (var n = 0; n < 16; ++n) {
        st1[n] = 0;
        r1[n] = 0;
      }

      var scfQ = new Array(16);
      var scfQint = new Array(64);
      var scfQint_tmp = new Array(64);
      var idxA = -1,
          LS_indA = -1;
      var gsns = new Array(64);
      var index_joint = 0;
      var Xs = new Array(NF);

      for (var _n21 = 0; _n21 < NF; ++_n21) {
        Xs[_n21] = 0;
      }

      var shape_j = -1,
          gain_i = -1;

      this.update = function (EB, X, Fatt_k) {
        if (NB < 64) {
          var i = 0,
              j = 0;

          for (var iEnd = 64 - NB; i < iEnd; ++i, j += 2) {
            var EBi = EB[i];
            EB2[j] = EBi;
            EB2[j + 1] = EBi;
          }

          for (; j < 64; ++i, ++j) {
            EB2[j] = EB[i];
          }

          EB = EB2;
        }

        {
          E64[0] = 0.75 * EB[0] + 0.25 * EB[1];
          E64[1] = 0.25 * EB[0] + 0.50 * EB[1] + 0.25 * EB[2];
          E64[2] = 0.25 * EB[1] + 0.50 * EB[2] + 0.25 * EB[3];
          E64[3] = 0.25 * EB[2] + 0.50 * EB[3] + 0.25 * EB[4];
          E64[4] = 0.25 * EB[3] + 0.50 * EB[4] + 0.25 * EB[5];
          E64[5] = 0.25 * EB[4] + 0.50 * EB[5] + 0.25 * EB[6];
          E64[6] = 0.25 * EB[5] + 0.50 * EB[6] + 0.25 * EB[7];
          E64[7] = 0.25 * EB[6] + 0.50 * EB[7] + 0.25 * EB[8];
          E64[8] = 0.25 * EB[7] + 0.50 * EB[8] + 0.25 * EB[9];
          E64[9] = 0.25 * EB[8] + 0.50 * EB[9] + 0.25 * EB[10];
          E64[10] = 0.25 * EB[9] + 0.50 * EB[10] + 0.25 * EB[11];
          E64[11] = 0.25 * EB[10] + 0.50 * EB[11] + 0.25 * EB[12];
          E64[12] = 0.25 * EB[11] + 0.50 * EB[12] + 0.25 * EB[13];
          E64[13] = 0.25 * EB[12] + 0.50 * EB[13] + 0.25 * EB[14];
          E64[14] = 0.25 * EB[13] + 0.50 * EB[14] + 0.25 * EB[15];
          E64[15] = 0.25 * EB[14] + 0.50 * EB[15] + 0.25 * EB[16];
          E64[16] = 0.25 * EB[15] + 0.50 * EB[16] + 0.25 * EB[17];
          E64[17] = 0.25 * EB[16] + 0.50 * EB[17] + 0.25 * EB[18];
          E64[18] = 0.25 * EB[17] + 0.50 * EB[18] + 0.25 * EB[19];
          E64[19] = 0.25 * EB[18] + 0.50 * EB[19] + 0.25 * EB[20];
          E64[20] = 0.25 * EB[19] + 0.50 * EB[20] + 0.25 * EB[21];
          E64[21] = 0.25 * EB[20] + 0.50 * EB[21] + 0.25 * EB[22];
          E64[22] = 0.25 * EB[21] + 0.50 * EB[22] + 0.25 * EB[23];
          E64[23] = 0.25 * EB[22] + 0.50 * EB[23] + 0.25 * EB[24];
          E64[24] = 0.25 * EB[23] + 0.50 * EB[24] + 0.25 * EB[25];
          E64[25] = 0.25 * EB[24] + 0.50 * EB[25] + 0.25 * EB[26];
          E64[26] = 0.25 * EB[25] + 0.50 * EB[26] + 0.25 * EB[27];
          E64[27] = 0.25 * EB[26] + 0.50 * EB[27] + 0.25 * EB[28];
          E64[28] = 0.25 * EB[27] + 0.50 * EB[28] + 0.25 * EB[29];
          E64[29] = 0.25 * EB[28] + 0.50 * EB[29] + 0.25 * EB[30];
          E64[30] = 0.25 * EB[29] + 0.50 * EB[30] + 0.25 * EB[31];
          E64[31] = 0.25 * EB[30] + 0.50 * EB[31] + 0.25 * EB[32];
          E64[32] = 0.25 * EB[31] + 0.50 * EB[32] + 0.25 * EB[33];
          E64[33] = 0.25 * EB[32] + 0.50 * EB[33] + 0.25 * EB[34];
          E64[34] = 0.25 * EB[33] + 0.50 * EB[34] + 0.25 * EB[35];
          E64[35] = 0.25 * EB[34] + 0.50 * EB[35] + 0.25 * EB[36];
          E64[36] = 0.25 * EB[35] + 0.50 * EB[36] + 0.25 * EB[37];
          E64[37] = 0.25 * EB[36] + 0.50 * EB[37] + 0.25 * EB[38];
          E64[38] = 0.25 * EB[37] + 0.50 * EB[38] + 0.25 * EB[39];
          E64[39] = 0.25 * EB[38] + 0.50 * EB[39] + 0.25 * EB[40];
          E64[40] = 0.25 * EB[39] + 0.50 * EB[40] + 0.25 * EB[41];
          E64[41] = 0.25 * EB[40] + 0.50 * EB[41] + 0.25 * EB[42];
          E64[42] = 0.25 * EB[41] + 0.50 * EB[42] + 0.25 * EB[43];
          E64[43] = 0.25 * EB[42] + 0.50 * EB[43] + 0.25 * EB[44];
          E64[44] = 0.25 * EB[43] + 0.50 * EB[44] + 0.25 * EB[45];
          E64[45] = 0.25 * EB[44] + 0.50 * EB[45] + 0.25 * EB[46];
          E64[46] = 0.25 * EB[45] + 0.50 * EB[46] + 0.25 * EB[47];
          E64[47] = 0.25 * EB[46] + 0.50 * EB[47] + 0.25 * EB[48];
          E64[48] = 0.25 * EB[47] + 0.50 * EB[48] + 0.25 * EB[49];
          E64[49] = 0.25 * EB[48] + 0.50 * EB[49] + 0.25 * EB[50];
          E64[50] = 0.25 * EB[49] + 0.50 * EB[50] + 0.25 * EB[51];
          E64[51] = 0.25 * EB[50] + 0.50 * EB[51] + 0.25 * EB[52];
          E64[52] = 0.25 * EB[51] + 0.50 * EB[52] + 0.25 * EB[53];
          E64[53] = 0.25 * EB[52] + 0.50 * EB[53] + 0.25 * EB[54];
          E64[54] = 0.25 * EB[53] + 0.50 * EB[54] + 0.25 * EB[55];
          E64[55] = 0.25 * EB[54] + 0.50 * EB[55] + 0.25 * EB[56];
          E64[56] = 0.25 * EB[55] + 0.50 * EB[56] + 0.25 * EB[57];
          E64[57] = 0.25 * EB[56] + 0.50 * EB[57] + 0.25 * EB[58];
          E64[58] = 0.25 * EB[57] + 0.50 * EB[58] + 0.25 * EB[59];
          E64[59] = 0.25 * EB[58] + 0.50 * EB[59] + 0.25 * EB[60];
          E64[60] = 0.25 * EB[59] + 0.50 * EB[60] + 0.25 * EB[61];
          E64[61] = 0.25 * EB[60] + 0.50 * EB[61] + 0.25 * EB[62];
          E64[62] = 0.25 * EB[61] + 0.50 * EB[62] + 0.25 * EB[63];
          E64[63] = 0.25 * EB[62] + 0.75 * EB[63];
        }
        {
          E64[0] *= pefactors[0];
          E64[1] *= pefactors[1];
          E64[2] *= pefactors[2];
          E64[3] *= pefactors[3];
          E64[4] *= pefactors[4];
          E64[5] *= pefactors[5];
          E64[6] *= pefactors[6];
          E64[7] *= pefactors[7];
          E64[8] *= pefactors[8];
          E64[9] *= pefactors[9];
          E64[10] *= pefactors[10];
          E64[11] *= pefactors[11];
          E64[12] *= pefactors[12];
          E64[13] *= pefactors[13];
          E64[14] *= pefactors[14];
          E64[15] *= pefactors[15];
          E64[16] *= pefactors[16];
          E64[17] *= pefactors[17];
          E64[18] *= pefactors[18];
          E64[19] *= pefactors[19];
          E64[20] *= pefactors[20];
          E64[21] *= pefactors[21];
          E64[22] *= pefactors[22];
          E64[23] *= pefactors[23];
          E64[24] *= pefactors[24];
          E64[25] *= pefactors[25];
          E64[26] *= pefactors[26];
          E64[27] *= pefactors[27];
          E64[28] *= pefactors[28];
          E64[29] *= pefactors[29];
          E64[30] *= pefactors[30];
          E64[31] *= pefactors[31];
          E64[32] *= pefactors[32];
          E64[33] *= pefactors[33];
          E64[34] *= pefactors[34];
          E64[35] *= pefactors[35];
          E64[36] *= pefactors[36];
          E64[37] *= pefactors[37];
          E64[38] *= pefactors[38];
          E64[39] *= pefactors[39];
          E64[40] *= pefactors[40];
          E64[41] *= pefactors[41];
          E64[42] *= pefactors[42];
          E64[43] *= pefactors[43];
          E64[44] *= pefactors[44];
          E64[45] *= pefactors[45];
          E64[46] *= pefactors[46];
          E64[47] *= pefactors[47];
          E64[48] *= pefactors[48];
          E64[49] *= pefactors[49];
          E64[50] *= pefactors[50];
          E64[51] *= pefactors[51];
          E64[52] *= pefactors[52];
          E64[53] *= pefactors[53];
          E64[54] *= pefactors[54];
          E64[55] *= pefactors[55];
          E64[56] *= pefactors[56];
          E64[57] *= pefactors[57];
          E64[58] *= pefactors[58];
          E64[59] *= pefactors[59];
          E64[60] *= pefactors[60];
          E64[61] *= pefactors[61];
          E64[62] *= pefactors[62];
          E64[63] *= pefactors[63];
        }
        var nsfloor = 0;
        {
          nsfloor += E64[0] / 64;
          nsfloor += E64[1] / 64;
          nsfloor += E64[2] / 64;
          nsfloor += E64[3] / 64;
          nsfloor += E64[4] / 64;
          nsfloor += E64[5] / 64;
          nsfloor += E64[6] / 64;
          nsfloor += E64[7] / 64;
          nsfloor += E64[8] / 64;
          nsfloor += E64[9] / 64;
          nsfloor += E64[10] / 64;
          nsfloor += E64[11] / 64;
          nsfloor += E64[12] / 64;
          nsfloor += E64[13] / 64;
          nsfloor += E64[14] / 64;
          nsfloor += E64[15] / 64;
          nsfloor += E64[16] / 64;
          nsfloor += E64[17] / 64;
          nsfloor += E64[18] / 64;
          nsfloor += E64[19] / 64;
          nsfloor += E64[20] / 64;
          nsfloor += E64[21] / 64;
          nsfloor += E64[22] / 64;
          nsfloor += E64[23] / 64;
          nsfloor += E64[24] / 64;
          nsfloor += E64[25] / 64;
          nsfloor += E64[26] / 64;
          nsfloor += E64[27] / 64;
          nsfloor += E64[28] / 64;
          nsfloor += E64[29] / 64;
          nsfloor += E64[30] / 64;
          nsfloor += E64[31] / 64;
          nsfloor += E64[32] / 64;
          nsfloor += E64[33] / 64;
          nsfloor += E64[34] / 64;
          nsfloor += E64[35] / 64;
          nsfloor += E64[36] / 64;
          nsfloor += E64[37] / 64;
          nsfloor += E64[38] / 64;
          nsfloor += E64[39] / 64;
          nsfloor += E64[40] / 64;
          nsfloor += E64[41] / 64;
          nsfloor += E64[42] / 64;
          nsfloor += E64[43] / 64;
          nsfloor += E64[44] / 64;
          nsfloor += E64[45] / 64;
          nsfloor += E64[46] / 64;
          nsfloor += E64[47] / 64;
          nsfloor += E64[48] / 64;
          nsfloor += E64[49] / 64;
          nsfloor += E64[50] / 64;
          nsfloor += E64[51] / 64;
          nsfloor += E64[52] / 64;
          nsfloor += E64[53] / 64;
          nsfloor += E64[54] / 64;
          nsfloor += E64[55] / 64;
          nsfloor += E64[56] / 64;
          nsfloor += E64[57] / 64;
          nsfloor += E64[58] / 64;
          nsfloor += E64[59] / 64;
          nsfloor += E64[60] / 64;
          nsfloor += E64[61] / 64;
          nsfloor += E64[62] / 64;
          nsfloor += E64[63] / 64;
          nsfloor *= 1e-4;

          if (nsfloor < NSFLOOR_MIN) {
            nsfloor = NSFLOOR_MIN;
          }
        }
        {
          E64[0] = Math.log2(Math.max(E64[0], nsfloor) + 1e-31) * 0.5;
          E64[1] = Math.log2(Math.max(E64[1], nsfloor) + 1e-31) * 0.5;
          E64[2] = Math.log2(Math.max(E64[2], nsfloor) + 1e-31) * 0.5;
          E64[3] = Math.log2(Math.max(E64[3], nsfloor) + 1e-31) * 0.5;
          E64[4] = Math.log2(Math.max(E64[4], nsfloor) + 1e-31) * 0.5;
          E64[5] = Math.log2(Math.max(E64[5], nsfloor) + 1e-31) * 0.5;
          E64[6] = Math.log2(Math.max(E64[6], nsfloor) + 1e-31) * 0.5;
          E64[7] = Math.log2(Math.max(E64[7], nsfloor) + 1e-31) * 0.5;
          E64[8] = Math.log2(Math.max(E64[8], nsfloor) + 1e-31) * 0.5;
          E64[9] = Math.log2(Math.max(E64[9], nsfloor) + 1e-31) * 0.5;
          E64[10] = Math.log2(Math.max(E64[10], nsfloor) + 1e-31) * 0.5;
          E64[11] = Math.log2(Math.max(E64[11], nsfloor) + 1e-31) * 0.5;
          E64[12] = Math.log2(Math.max(E64[12], nsfloor) + 1e-31) * 0.5;
          E64[13] = Math.log2(Math.max(E64[13], nsfloor) + 1e-31) * 0.5;
          E64[14] = Math.log2(Math.max(E64[14], nsfloor) + 1e-31) * 0.5;
          E64[15] = Math.log2(Math.max(E64[15], nsfloor) + 1e-31) * 0.5;
          E64[16] = Math.log2(Math.max(E64[16], nsfloor) + 1e-31) * 0.5;
          E64[17] = Math.log2(Math.max(E64[17], nsfloor) + 1e-31) * 0.5;
          E64[18] = Math.log2(Math.max(E64[18], nsfloor) + 1e-31) * 0.5;
          E64[19] = Math.log2(Math.max(E64[19], nsfloor) + 1e-31) * 0.5;
          E64[20] = Math.log2(Math.max(E64[20], nsfloor) + 1e-31) * 0.5;
          E64[21] = Math.log2(Math.max(E64[21], nsfloor) + 1e-31) * 0.5;
          E64[22] = Math.log2(Math.max(E64[22], nsfloor) + 1e-31) * 0.5;
          E64[23] = Math.log2(Math.max(E64[23], nsfloor) + 1e-31) * 0.5;
          E64[24] = Math.log2(Math.max(E64[24], nsfloor) + 1e-31) * 0.5;
          E64[25] = Math.log2(Math.max(E64[25], nsfloor) + 1e-31) * 0.5;
          E64[26] = Math.log2(Math.max(E64[26], nsfloor) + 1e-31) * 0.5;
          E64[27] = Math.log2(Math.max(E64[27], nsfloor) + 1e-31) * 0.5;
          E64[28] = Math.log2(Math.max(E64[28], nsfloor) + 1e-31) * 0.5;
          E64[29] = Math.log2(Math.max(E64[29], nsfloor) + 1e-31) * 0.5;
          E64[30] = Math.log2(Math.max(E64[30], nsfloor) + 1e-31) * 0.5;
          E64[31] = Math.log2(Math.max(E64[31], nsfloor) + 1e-31) * 0.5;
          E64[32] = Math.log2(Math.max(E64[32], nsfloor) + 1e-31) * 0.5;
          E64[33] = Math.log2(Math.max(E64[33], nsfloor) + 1e-31) * 0.5;
          E64[34] = Math.log2(Math.max(E64[34], nsfloor) + 1e-31) * 0.5;
          E64[35] = Math.log2(Math.max(E64[35], nsfloor) + 1e-31) * 0.5;
          E64[36] = Math.log2(Math.max(E64[36], nsfloor) + 1e-31) * 0.5;
          E64[37] = Math.log2(Math.max(E64[37], nsfloor) + 1e-31) * 0.5;
          E64[38] = Math.log2(Math.max(E64[38], nsfloor) + 1e-31) * 0.5;
          E64[39] = Math.log2(Math.max(E64[39], nsfloor) + 1e-31) * 0.5;
          E64[40] = Math.log2(Math.max(E64[40], nsfloor) + 1e-31) * 0.5;
          E64[41] = Math.log2(Math.max(E64[41], nsfloor) + 1e-31) * 0.5;
          E64[42] = Math.log2(Math.max(E64[42], nsfloor) + 1e-31) * 0.5;
          E64[43] = Math.log2(Math.max(E64[43], nsfloor) + 1e-31) * 0.5;
          E64[44] = Math.log2(Math.max(E64[44], nsfloor) + 1e-31) * 0.5;
          E64[45] = Math.log2(Math.max(E64[45], nsfloor) + 1e-31) * 0.5;
          E64[46] = Math.log2(Math.max(E64[46], nsfloor) + 1e-31) * 0.5;
          E64[47] = Math.log2(Math.max(E64[47], nsfloor) + 1e-31) * 0.5;
          E64[48] = Math.log2(Math.max(E64[48], nsfloor) + 1e-31) * 0.5;
          E64[49] = Math.log2(Math.max(E64[49], nsfloor) + 1e-31) * 0.5;
          E64[50] = Math.log2(Math.max(E64[50], nsfloor) + 1e-31) * 0.5;
          E64[51] = Math.log2(Math.max(E64[51], nsfloor) + 1e-31) * 0.5;
          E64[52] = Math.log2(Math.max(E64[52], nsfloor) + 1e-31) * 0.5;
          E64[53] = Math.log2(Math.max(E64[53], nsfloor) + 1e-31) * 0.5;
          E64[54] = Math.log2(Math.max(E64[54], nsfloor) + 1e-31) * 0.5;
          E64[55] = Math.log2(Math.max(E64[55], nsfloor) + 1e-31) * 0.5;
          E64[56] = Math.log2(Math.max(E64[56], nsfloor) + 1e-31) * 0.5;
          E64[57] = Math.log2(Math.max(E64[57], nsfloor) + 1e-31) * 0.5;
          E64[58] = Math.log2(Math.max(E64[58], nsfloor) + 1e-31) * 0.5;
          E64[59] = Math.log2(Math.max(E64[59], nsfloor) + 1e-31) * 0.5;
          E64[60] = Math.log2(Math.max(E64[60], nsfloor) + 1e-31) * 0.5;
          E64[61] = Math.log2(Math.max(E64[61], nsfloor) + 1e-31) * 0.5;
          E64[62] = Math.log2(Math.max(E64[62], nsfloor) + 1e-31) * 0.5;
          E64[63] = Math.log2(Math.max(E64[63], nsfloor) + 1e-31) * 0.5;
        }
        {
          E4[0] = E64[0] / 12 + E64[0] / 6 + E64[1] / 4 + E64[2] / 4 + E64[3] / 6 + E64[4] / 12;
          E4[1] = E64[3] / 12 + E64[4] / 6 + E64[5] / 4 + E64[6] / 4 + E64[7] / 6 + E64[8] / 12;
          E4[2] = E64[7] / 12 + E64[8] / 6 + E64[9] / 4 + E64[10] / 4 + E64[11] / 6 + E64[12] / 12;
          E4[3] = E64[11] / 12 + E64[12] / 6 + E64[13] / 4 + E64[14] / 4 + E64[15] / 6 + E64[16] / 12;
          E4[4] = E64[15] / 12 + E64[16] / 6 + E64[17] / 4 + E64[18] / 4 + E64[19] / 6 + E64[20] / 12;
          E4[5] = E64[19] / 12 + E64[20] / 6 + E64[21] / 4 + E64[22] / 4 + E64[23] / 6 + E64[24] / 12;
          E4[6] = E64[23] / 12 + E64[24] / 6 + E64[25] / 4 + E64[26] / 4 + E64[27] / 6 + E64[28] / 12;
          E4[7] = E64[27] / 12 + E64[28] / 6 + E64[29] / 4 + E64[30] / 4 + E64[31] / 6 + E64[32] / 12;
          E4[8] = E64[31] / 12 + E64[32] / 6 + E64[33] / 4 + E64[34] / 4 + E64[35] / 6 + E64[36] / 12;
          E4[9] = E64[35] / 12 + E64[36] / 6 + E64[37] / 4 + E64[38] / 4 + E64[39] / 6 + E64[40] / 12;
          E4[10] = E64[39] / 12 + E64[40] / 6 + E64[41] / 4 + E64[42] / 4 + E64[43] / 6 + E64[44] / 12;
          E4[11] = E64[43] / 12 + E64[44] / 6 + E64[45] / 4 + E64[46] / 4 + E64[47] / 6 + E64[48] / 12;
          E4[12] = E64[47] / 12 + E64[48] / 6 + E64[49] / 4 + E64[50] / 4 + E64[51] / 6 + E64[52] / 12;
          E4[13] = E64[51] / 12 + E64[52] / 6 + E64[53] / 4 + E64[54] / 4 + E64[55] / 6 + E64[56] / 12;
          E4[14] = E64[55] / 12 + E64[56] / 6 + E64[57] / 4 + E64[58] / 4 + E64[59] / 6 + E64[60] / 12;
          E4[15] = E64[59] / 12 + E64[60] / 6 + E64[61] / 4 + E64[62] / 4 + E64[63] / 6 + E64[63] / 12;
        }
        {
          var E4mean = (E4[0] + E4[1] + E4[2] + E4[3] + E4[4] + E4[5] + E4[6] + E4[7] + E4[8] + E4[9] + E4[10] + E4[11] + E4[12] + E4[13] + E4[14] + E4[15]) / 16;
          scf0[0] = 0.85 * (E4[0] - E4mean);
          scf0[1] = 0.85 * (E4[1] - E4mean);
          scf0[2] = 0.85 * (E4[2] - E4mean);
          scf0[3] = 0.85 * (E4[3] - E4mean);
          scf0[4] = 0.85 * (E4[4] - E4mean);
          scf0[5] = 0.85 * (E4[5] - E4mean);
          scf0[6] = 0.85 * (E4[6] - E4mean);
          scf0[7] = 0.85 * (E4[7] - E4mean);
          scf0[8] = 0.85 * (E4[8] - E4mean);
          scf0[9] = 0.85 * (E4[9] - E4mean);
          scf0[10] = 0.85 * (E4[10] - E4mean);
          scf0[11] = 0.85 * (E4[11] - E4mean);
          scf0[12] = 0.85 * (E4[12] - E4mean);
          scf0[13] = 0.85 * (E4[13] - E4mean);
          scf0[14] = 0.85 * (E4[14] - E4mean);
          scf0[15] = 0.85 * (E4[15] - E4mean);
        }
        var scf;
        {
          if (Fatt_k != 0) {
            scf1[0] = (scf0[0] + scf0[1] + scf0[2]) / 3;
            scf1[1] = (scf0[0] + scf0[1] + scf0[2] + scf0[3]) / 4;
            scf1[2] = (scf0[0] + scf0[1] + scf0[2] + scf0[3] + scf0[4]) / 5;
            scf1[3] = (scf0[1] + scf0[2] + scf0[3] + scf0[4] + scf0[5]) / 5;
            scf1[4] = (scf0[2] + scf0[3] + scf0[4] + scf0[5] + scf0[6]) / 5;
            scf1[5] = (scf0[3] + scf0[4] + scf0[5] + scf0[6] + scf0[7]) / 5;
            scf1[6] = (scf0[4] + scf0[5] + scf0[6] + scf0[7] + scf0[8]) / 5;
            scf1[7] = (scf0[5] + scf0[6] + scf0[7] + scf0[8] + scf0[9]) / 5;
            scf1[8] = (scf0[6] + scf0[7] + scf0[8] + scf0[9] + scf0[10]) / 5;
            scf1[9] = (scf0[7] + scf0[8] + scf0[9] + scf0[10] + scf0[11]) / 5;
            scf1[10] = (scf0[8] + scf0[9] + scf0[10] + scf0[11] + scf0[12]) / 5;
            scf1[11] = (scf0[9] + scf0[10] + scf0[11] + scf0[12] + scf0[13]) / 5;
            scf1[12] = (scf0[10] + scf0[11] + scf0[12] + scf0[13] + scf0[14]) / 5;
            scf1[13] = (scf0[11] + scf0[12] + scf0[13] + scf0[14] + scf0[15]) / 5;
            scf1[14] = (scf0[12] + scf0[13] + scf0[14] + scf0[15]) / 4;
            scf1[15] = (scf0[13] + scf0[14] + scf0[15]) / 3;
            var scf1_mean = (scf1[0] + scf1[1] + scf1[2] + scf1[3] + scf1[4] + scf1[5] + scf1[6] + scf1[7] + scf1[8] + scf1[9] + scf1[10] + scf1[11] + scf1[12] + scf1[13] + scf1[14] + scf1[15]) / 16;
            scf1[0] = fatt * (scf1[0] - scf1_mean);
            scf1[1] = fatt * (scf1[1] - scf1_mean);
            scf1[2] = fatt * (scf1[2] - scf1_mean);
            scf1[3] = fatt * (scf1[3] - scf1_mean);
            scf1[4] = fatt * (scf1[4] - scf1_mean);
            scf1[5] = fatt * (scf1[5] - scf1_mean);
            scf1[6] = fatt * (scf1[6] - scf1_mean);
            scf1[7] = fatt * (scf1[7] - scf1_mean);
            scf1[8] = fatt * (scf1[8] - scf1_mean);
            scf1[9] = fatt * (scf1[9] - scf1_mean);
            scf1[10] = fatt * (scf1[10] - scf1_mean);
            scf1[11] = fatt * (scf1[11] - scf1_mean);
            scf1[12] = fatt * (scf1[12] - scf1_mean);
            scf1[13] = fatt * (scf1[13] - scf1_mean);
            scf1[14] = fatt * (scf1[14] - scf1_mean);
            scf1[15] = fatt * (scf1[15] - scf1_mean);
            scf = scf1;
          } else {
            scf = scf0;
          }
        }
        {
          var dMSE_LFmin = Infinity;
          var dMSE_HFmin = Infinity;

          for (var _i5 = 0; _i5 < 32; ++_i5) {
            var tmp = void 0,
                codebook = void 0;
            var dMSE_LFi = void 0;
            codebook = LFCB[_i5];
            tmp = scf[0] - codebook[0];
            dMSE_LFi = tmp * tmp;
            tmp = scf[1] - codebook[1];
            dMSE_LFi += tmp * tmp;
            tmp = scf[2] - codebook[2];
            dMSE_LFi += tmp * tmp;
            tmp = scf[3] - codebook[3];
            dMSE_LFi += tmp * tmp;
            tmp = scf[4] - codebook[4];
            dMSE_LFi += tmp * tmp;
            tmp = scf[5] - codebook[5];
            dMSE_LFi += tmp * tmp;
            tmp = scf[6] - codebook[6];
            dMSE_LFi += tmp * tmp;
            tmp = scf[7] - codebook[7];
            dMSE_LFi += tmp * tmp;
            var dMSE_HFi = void 0;
            codebook = HFCB[_i5];
            tmp = scf[8] - codebook[0];
            dMSE_HFi = tmp * tmp;
            tmp = scf[9] - codebook[1];
            dMSE_HFi += tmp * tmp;
            tmp = scf[10] - codebook[2];
            dMSE_HFi += tmp * tmp;
            tmp = scf[11] - codebook[3];
            dMSE_HFi += tmp * tmp;
            tmp = scf[12] - codebook[4];
            dMSE_HFi += tmp * tmp;
            tmp = scf[13] - codebook[5];
            dMSE_HFi += tmp * tmp;
            tmp = scf[14] - codebook[6];
            dMSE_HFi += tmp * tmp;
            tmp = scf[15] - codebook[7];
            dMSE_HFi += tmp * tmp;

            if (dMSE_LFi < dMSE_LFmin) {
              dMSE_LFmin = dMSE_LFi;
              ind_LF = _i5;
            }

            if (dMSE_HFi < dMSE_HFmin) {
              dMSE_HFmin = dMSE_HFi;
              ind_HF = _i5;
            }
          }
        }
        {
          var _codebook;

          _codebook = LFCB[ind_LF];
          st1[0] = _codebook[0];
          st1[1] = _codebook[1];
          st1[2] = _codebook[2];
          st1[3] = _codebook[3];
          st1[4] = _codebook[4];
          st1[5] = _codebook[5];
          st1[6] = _codebook[6];
          st1[7] = _codebook[7];
          _codebook = HFCB[ind_HF];
          st1[8] = _codebook[0];
          st1[9] = _codebook[1];
          st1[10] = _codebook[2];
          st1[11] = _codebook[3];
          st1[12] = _codebook[4];
          st1[13] = _codebook[5];
          st1[14] = _codebook[6];
          st1[15] = _codebook[7];
        }
        {
          r1[0] = scf[0] - st1[0];
          r1[1] = scf[1] - st1[1];
          r1[2] = scf[2] - st1[2];
          r1[3] = scf[3] - st1[3];
          r1[4] = scf[4] - st1[4];
          r1[5] = scf[5] - st1[5];
          r1[6] = scf[6] - st1[6];
          r1[7] = scf[7] - st1[7];
          r1[8] = scf[8] - st1[8];
          r1[9] = scf[9] - st1[9];
          r1[10] = scf[10] - st1[10];
          r1[11] = scf[11] - st1[11];
          r1[12] = scf[12] - st1[12];
          r1[13] = scf[13] - st1[13];
          r1[14] = scf[14] - st1[14];
          r1[15] = scf[15] - st1[15];
        }
        {
          for (var _n22 = 0; _n22 < 16; ++_n22) {
            var _tmp12 = 0;

            for (var row = 0; row < 16; ++row) {
              _tmp12 += r1[row] * DCTII_16x16[row][_n22];
            }

            t2rot[_n22] = _tmp12;
          }

          for (var _n23 = 0; _n23 < 10; ++_n23) {
            t2rot_setA[_n23] = t2rot[_n23];
          }

          for (var _n24 = 10, _i6 = 0; _n24 < 16; ++_n24, ++_i6) {
            t2rot_setB[_i6] = t2rot[_n24];
          }
        }
        {
          PVQSearch(10, 10, t2rot_setA, sns_y0_setA, pvq_cache_s);
          PVQSearch(6, 1, t2rot_setB, sns_y0_setB, pvq_cache_s);
          PVQSearch(16, 8, t2rot, sns_y2, pvq_cache_s);
          PVQSearch(16, 6, t2rot, sns_y3, pvq_cache_s);
          sns_y0[0] = sns_y0_setA[0];
          sns_y0[1] = sns_y0_setA[1];
          sns_y0[2] = sns_y0_setA[2];
          sns_y0[3] = sns_y0_setA[3];
          sns_y0[4] = sns_y0_setA[4];
          sns_y0[5] = sns_y0_setA[5];
          sns_y0[6] = sns_y0_setA[6];
          sns_y0[7] = sns_y0_setA[7];
          sns_y0[8] = sns_y0_setA[8];
          sns_y0[9] = sns_y0_setA[9];
          sns_y0[10] = sns_y0_setB[0];
          sns_y0[11] = sns_y0_setB[1];
          sns_y0[12] = sns_y0_setB[2];
          sns_y0[13] = sns_y0_setB[3];
          sns_y0[14] = sns_y0_setB[4];
          sns_y0[15] = sns_y0_setB[5];
          sns_y1[0] = sns_y0_setA[0];
          sns_y1[1] = sns_y0_setA[1];
          sns_y1[2] = sns_y0_setA[2];
          sns_y1[3] = sns_y0_setA[3];
          sns_y1[4] = sns_y0_setA[4];
          sns_y1[5] = sns_y0_setA[5];
          sns_y1[6] = sns_y0_setA[6];
          sns_y1[7] = sns_y0_setA[7];
          sns_y1[8] = sns_y0_setA[8];
          sns_y1[9] = sns_y0_setA[9];
          sns_y1[10] = 0;
          sns_y1[11] = 0;
          sns_y1[12] = 0;
          sns_y1[13] = 0;
          sns_y1[14] = 0;
          sns_y1[15] = 0;
          PVQNormalize(sns_y0, sns_xq0);
          PVQNormalize(sns_y1, sns_xq1);
          PVQNormalize(sns_y2, sns_xq2);
          PVQNormalize(sns_y3, sns_xq3);
        }
        {
          var dMSE_min = Infinity;

          for (var _j = 0; _j < 4; ++_j) {
            var gains = GIJ[_j];
            var vec = sns_xq[_j];

            for (var _i7 = 0, ngains = gains.length; _i7 < ngains; ++_i7) {
              var gain = gains[_i7];

              var _tmp13 = void 0;

              var dMSE = void 0;
              _tmp13 = t2rot[0] - gain * vec[0];
              dMSE = _tmp13 * _tmp13;
              _tmp13 = t2rot[1] - gain * vec[1];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[2] - gain * vec[2];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[3] - gain * vec[3];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[4] - gain * vec[4];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[5] - gain * vec[5];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[6] - gain * vec[6];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[7] - gain * vec[7];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[8] - gain * vec[8];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[9] - gain * vec[9];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[10] - gain * vec[10];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[11] - gain * vec[11];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[12] - gain * vec[12];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[13] - gain * vec[13];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[14] - gain * vec[14];
              dMSE += _tmp13 * _tmp13;
              _tmp13 = t2rot[15] - gain * vec[15];
              dMSE += _tmp13 * _tmp13;

              if (dMSE < dMSE_min) {
                dMSE_min = dMSE;
                shape_j = _j;
                gain_i = _i7;
              }
            }
          }
        }
        var idxB = -1,
            LS_indB = -1;
        {
          switch (shape_j) {
            case 0:
              MPVQ_16x10.enumerate(sns_y0_setB, mpvq_enum_cache);
              idxB = mpvq_enum_cache[1];
              LS_indB = mpvq_enum_cache[0];

            case 1:
              MPVQ_16x10.enumerate(sns_y0_setA, mpvq_enum_cache);
              idxA = mpvq_enum_cache[1];
              LS_indA = mpvq_enum_cache[0];
              break;

            case 2:
              MPVQ_16x10.enumerate(sns_y2, mpvq_enum_cache);
              idxA = mpvq_enum_cache[1];
              LS_indA = mpvq_enum_cache[0];
              break;

            case 3:
              MPVQ_16x10.enumerate(sns_y3, mpvq_enum_cache);
              idxA = mpvq_enum_cache[1];
              LS_indA = mpvq_enum_cache[0];
              break;

            default:
              throw new LC3BugError("Never reach.");
          }
        }
        {
          switch (shape_j) {
            case 0:
              index_joint = (2 * idxB + LS_indB + 2) * 2390004 + idxA;
              break;

            case 1:
              index_joint = ((gain_i & 1) >>> 0) * 2390004 + idxA;
              break;

            case 2:
              index_joint = idxA;
              break;

            case 3:
              index_joint = 15158272 + ((gain_i & 1) >>> 0) + 2 * idxA;
              break;

            default:
              throw new LC3BugError("Never reach.");
          }
        }
        {
          var _vec = sns_xq[shape_j];
          var _gain = GIJ[shape_j][gain_i];

          for (var _n25 = 0; _n25 < 16; ++_n25) {
            var scfQ_n = st1[_n25];

            for (var col = 0; col < 16; ++col) {
              scfQ_n += _gain * _vec[col] * DCTII_16x16[_n25][col];
            }

            scfQ[_n25] = scfQ_n;
          }
        }
        {
          var t1, t2;
          scfQint[0] = scfQ[0];
          scfQint[1] = scfQ[0];
          t1 = scfQ[0];
          t2 = (scfQ[1] - t1) / 8;
          scfQint[2] = t1 + t2;
          scfQint[3] = t1 + 3 * t2;
          scfQint[4] = t1 + 5 * t2;
          scfQint[5] = t1 + 7 * t2;
          t1 = scfQ[1];
          t2 = (scfQ[2] - t1) / 8;
          scfQint[6] = t1 + t2;
          scfQint[7] = t1 + 3 * t2;
          scfQint[8] = t1 + 5 * t2;
          scfQint[9] = t1 + 7 * t2;
          t1 = scfQ[2];
          t2 = (scfQ[3] - t1) / 8;
          scfQint[10] = t1 + t2;
          scfQint[11] = t1 + 3 * t2;
          scfQint[12] = t1 + 5 * t2;
          scfQint[13] = t1 + 7 * t2;
          t1 = scfQ[3];
          t2 = (scfQ[4] - t1) / 8;
          scfQint[14] = t1 + t2;
          scfQint[15] = t1 + 3 * t2;
          scfQint[16] = t1 + 5 * t2;
          scfQint[17] = t1 + 7 * t2;
          t1 = scfQ[4];
          t2 = (scfQ[5] - t1) / 8;
          scfQint[18] = t1 + t2;
          scfQint[19] = t1 + 3 * t2;
          scfQint[20] = t1 + 5 * t2;
          scfQint[21] = t1 + 7 * t2;
          t1 = scfQ[5];
          t2 = (scfQ[6] - t1) / 8;
          scfQint[22] = t1 + t2;
          scfQint[23] = t1 + 3 * t2;
          scfQint[24] = t1 + 5 * t2;
          scfQint[25] = t1 + 7 * t2;
          t1 = scfQ[6];
          t2 = (scfQ[7] - t1) / 8;
          scfQint[26] = t1 + t2;
          scfQint[27] = t1 + 3 * t2;
          scfQint[28] = t1 + 5 * t2;
          scfQint[29] = t1 + 7 * t2;
          t1 = scfQ[7];
          t2 = (scfQ[8] - t1) / 8;
          scfQint[30] = t1 + t2;
          scfQint[31] = t1 + 3 * t2;
          scfQint[32] = t1 + 5 * t2;
          scfQint[33] = t1 + 7 * t2;
          t1 = scfQ[8];
          t2 = (scfQ[9] - t1) / 8;
          scfQint[34] = t1 + t2;
          scfQint[35] = t1 + 3 * t2;
          scfQint[36] = t1 + 5 * t2;
          scfQint[37] = t1 + 7 * t2;
          t1 = scfQ[9];
          t2 = (scfQ[10] - t1) / 8;
          scfQint[38] = t1 + t2;
          scfQint[39] = t1 + 3 * t2;
          scfQint[40] = t1 + 5 * t2;
          scfQint[41] = t1 + 7 * t2;
          t1 = scfQ[10];
          t2 = (scfQ[11] - t1) / 8;
          scfQint[42] = t1 + t2;
          scfQint[43] = t1 + 3 * t2;
          scfQint[44] = t1 + 5 * t2;
          scfQint[45] = t1 + 7 * t2;
          t1 = scfQ[11];
          t2 = (scfQ[12] - t1) / 8;
          scfQint[46] = t1 + t2;
          scfQint[47] = t1 + 3 * t2;
          scfQint[48] = t1 + 5 * t2;
          scfQint[49] = t1 + 7 * t2;
          t1 = scfQ[12];
          t2 = (scfQ[13] - t1) / 8;
          scfQint[50] = t1 + t2;
          scfQint[51] = t1 + 3 * t2;
          scfQint[52] = t1 + 5 * t2;
          scfQint[53] = t1 + 7 * t2;
          t1 = scfQ[13];
          t2 = (scfQ[14] - t1) / 8;
          scfQint[54] = t1 + t2;
          scfQint[55] = t1 + 3 * t2;
          scfQint[56] = t1 + 5 * t2;
          scfQint[57] = t1 + 7 * t2;
          t1 = scfQ[14];
          t2 = (scfQ[15] - t1) / 8;
          scfQint[58] = t1 + t2;
          scfQint[59] = t1 + 3 * t2;
          scfQint[60] = t1 + 5 * t2;
          scfQint[61] = t1 + 7 * t2;
          t1 = scfQ[15];
          scfQint[62] = t1 + t2;
          scfQint[63] = t1 + 3 * t2;
        }
        var scfQint_use;
        {
          if (NB < 64) {
            var _i8 = 0,
                _iEnd2 = 64 - NB,
                _j2 = 0;

            for (; _i8 < _iEnd2; ++_i8, _j2 += 2) {
              scfQint_tmp[_i8] = 0.5 * (scfQint[_j2] + scfQint[_j2 + 1]);
            }

            for (; _i8 < NB; ++_i8) {
              scfQint_tmp[_i8] = scfQint[_iEnd2 + _i8];
            }

            scfQint_use = scfQint_tmp;
          } else {
            scfQint_use = scfQint;
          }
        }
        {
          for (var b = 0; b < NB; ++b) {
            gsns[b] = Math.pow(2, -scfQint_use[b]);
          }

          for (var _b4 = NB; _b4 < 64; ++_b4) {
            gsns[_b4] = 0;
          }
        }
        {
          for (var _b5 = 0; _b5 < NB; ++_b5) {
            var gsns_b = gsns[_b5];

            for (var k = Ifs[_b5], kEnd = Ifs[_b5 + 1]; k < kEnd; ++k) {
              Xs[k] = X[k] * gsns_b;
            }
          }
        }
      };

      this.getVectorQuantizationParameters = function () {
        var VQP = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Array(6);

        if (VQP.length != 6) {
          throw new LC3IllegalParameterError("VQP size mismatches.");
        }

        VQP[0] = ind_LF;
        VQP[1] = ind_HF;
        VQP[2] = gain_i;
        VQP[3] = shape_j;
        VQP[4] = index_joint;
        VQP[5] = LS_indA;
        return VQP;
      };

      this.getShapedSpectrumCoefficients = function () {
        return Xs;
      };
    }

    module.exports = {
      "LC3SpectralNoiseShapingEncoder": LC3SpectralNoiseShapingEncoder
    };
  },
  "lc3/encoder/sq": function lc3EncoderSq(module, require) {
    var Lc3TblAcSpec = require("./../tables/ac_spec");

    var Lc3TblNE = require("./../tables/ne");

    var Lc3TblSQ = require("./../tables/sq");

    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3Error = require("./../error");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var AC_SPEC_LOOKUP = Lc3TblAcSpec.AC_SPEC_LOOKUP;
    var AC_SPEC_BITS = Lc3TblAcSpec.AC_SPEC_BITS;
    var NE_TBL = Lc3TblNE.NE_TBL;
    var NBITSLASTNZ_TBL = Lc3TblSQ.NBITSLASTNZ_TBL;
    var GGOFF_TBL = Lc3TblSQ.GGOFF_TBL;
    var BITRATE_C1 = Lc3TblSQ.BITRATE_C1;
    var BITRATE_C2 = Lc3TblSQ.BITRATE_C2;
    var GGADJ_T1 = [80, 230, 380, 530, 680];
    var GGADJ_T2 = [500, 1025, 1550, 2075, 2600];
    var GGADJ_T3 = [850, 1700, 2550, 3400, 4250];
    var NBITS_SNS = 38;
    var NBITS_GAIN = 8;
    var NBITS_NF = 3;

    function LC3SpectralQuantization(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var fsind = Fs.getSampleRateIndex();
      var NE = NE_TBL[index_Nms][index_Fs];
      var NE_div_2 = NE >>> 1;
      var NE_div_4 = NE >>> 2;
      var nbits_ari_base = NBITSLASTNZ_TBL[index_Nms][index_Fs];
      var bitrate_c1 = BITRATE_C1[fsind];
      var bitrate_c2 = BITRATE_C2[fsind];
      var gg_t1_fsi = GGADJ_T1[fsind];
      var gg_t2_fsi = GGADJ_T2[fsind];
      var gg_t3_fsi = GGADJ_T3[fsind];
      var gg = 0;
      var gg_ind = 0;
      var ED = new Array(NE_div_4);
      var nbits_trunc = 0;
      var nbits_spec = 0;
      var reset_offset_old = 0;
      var nbits_offset_old = 0;
      var nbits_spec_old = 0;
      var nbits_est_old = 0;
      var Xq = new Array(NE);
      var lsbMode = 0;
      var lastnz_trunc = 0;
      var rateFlag = 0,
          modeFlag = 0;

      this.update = function (Xf, nbits, nbitsBW, nbitsTNS, nbitsLTPF) {
        {
          var nbits_ari = nbits_ari_base;

          if (nbits <= 1280) {
            nbits_ari += 3;
          } else if (nbits <= 2560) {
            nbits_ari += 4;
          } else {
            nbits_ari += 5;
          }

          nbits_spec = nbits - nbitsBW - nbitsTNS - nbitsLTPF - NBITS_SNS - NBITS_GAIN - NBITS_NF - nbits_ari;
        }
        var nbits_offset, nbits_spec_2;
        {
          if (reset_offset_old == 0) {
            nbits_offset = nbits_offset_old + nbits_spec_old - nbits_est_old;

            if (nbits_offset < -40) {
              nbits_offset = -40;
            } else if (nbits_offset > 40) {
              nbits_offset = 40;
            } else {}

            nbits_offset = 0.8 * nbits_offset_old + 0.2 * nbits_offset;
          } else {
            nbits_offset = 0;
          }

          nbits_spec_2 = Math.round(nbits_spec + nbits_offset);
        }
        var gg_off;
        {
          gg_off = GGOFF_TBL[fsind][(nbits >>> 3) - 20];
        }
        {
          for (var k = 0, kMul4 = 0; k < NE_div_4; ++k, kMul4 += 4) {
            var Xf0 = Xf[kMul4];
            var Xf1 = Xf[kMul4 + 1];
            var Xf2 = Xf[kMul4 + 2];
            var Xf3 = Xf[kMul4 + 3];
            ED[k] = 10 * Math.log10(4.656612873077393e-10 + Xf0 * Xf0 + Xf1 * Xf1 + Xf2 * Xf2 + Xf3 * Xf3);
          }
        }
        var gg_min, Xf_max;
        {
          Xf_max = 0;

          for (var n = 0; n < NE; ++n) {
            var Xf_n_abs = Math.abs(Xf[n]);

            if (Xf_n_abs > Xf_max) {
              Xf_max = Xf_n_abs;
            }
          }

          if (Xf_max < 1e-31) {
            gg_min = 0;
          } else {
            gg_min = Math.ceil(28 * Math.log10(1e-31 + Xf_max / 32767.625)) - gg_off;
          }
        }
        {
          var fac = 256;
          gg_ind = 255;

          for (var iter = 0; iter < 8; ++iter) {
            var gg_ind_old = gg_ind;
            fac >>>= 1;
            gg_ind -= fac;
            var gg_sum = gg_ind + gg_off;
            var tmp = 0;
            var iszero = true;

            for (var i = NE_div_4 - 1; i >= 0; --i) {
              var Ei = ED[i];
              var Ei_mul_1p4 = Ei * 1.4;

              if (Ei_mul_1p4 < gg_sum) {
                if (!iszero) {
                  tmp += 3.78;
                }
              } else {
                if (gg_sum < Ei_mul_1p4 - 60.2) {
                  tmp += 2 * Ei_mul_1p4 - 2 * gg_sum - 50.4;
                } else {
                  tmp += Ei_mul_1p4 - gg_sum + 9.8;
                }

                iszero = false;
              }
            }

            if (tmp > nbits_spec_2 * 1.96 && !iszero) {
              gg_ind = gg_ind_old;
            }
          }
        }
        var reset_offset;
        {
          if (gg_ind < gg_min || Xf_max < 1e-31) {
            gg_ind = gg_min;
            reset_offset = 1;
          } else {
            reset_offset = 0;
          }
        }
        var nbits_est_prior_requantize = -1;
        var nbits_est = -1;
        var nbits_lsb = -1;
        var lastnz = -1;
        var first_quantize = true,
            requantize = false;

        while (first_quantize || requantize) {
          {
            gg = Math.pow(10, (gg_ind + gg_off) / 28);
          }
          {
            for (var _n26 = 0; _n26 < NE; ++_n26) {
              var _tmp14 = Xf[_n26];

              if (_tmp14 >= 0) {
                _tmp14 = Math.trunc(_tmp14 / gg + 0.375);
              } else {
                _tmp14 = Math.ceil(_tmp14 / gg - 0.375);
              }

              if (_tmp14 > 32767) {
                _tmp14 = 32767;
              } else if (_tmp14 < -32768) {
                _tmp14 = -32768;
              } else {}

              Xq[_n26] = _tmp14;
            }
          }
          {
            if (nbits > bitrate_c1) {
              rateFlag = 512;
            } else {
              rateFlag = 0;
            }

            if (nbits >= bitrate_c2) {
              modeFlag = 1;
            } else {
              modeFlag = 0;
            }
          }
          {
            lastnz = NE;

            while (lastnz > 2 && Xq[lastnz - 1] == 0 && Xq[lastnz - 2] == 0) {
              lastnz -= 2;
            }
          }
          {
            nbits_est = 0;
            nbits_trunc = 0;
            nbits_lsb = 0;
            lastnz_trunc = 2;
            var c = 0;

            for (var _n27 = 0; _n27 < lastnz; _n27 += 2) {
              var Xq_n0 = Xq[_n27];
              var Xq_n1 = Xq[_n27 + 1];
              var t = c + rateFlag;

              if (_n27 > NE_div_2) {
                t += 256;
              }

              var a = Math.abs(Xq_n0);
              var a_lsb = a;
              var b = Math.abs(Xq_n1);
              var b_lsb = b;
              var lev = 0;

              while (a >= 4 || b >= 4) {
                var _pki2 = AC_SPEC_LOOKUP[t + (lev << 10 >>> 0)];
                nbits_est += AC_SPEC_BITS[_pki2][16];

                if (lev == 0 && modeFlag == 1) {
                  nbits_lsb += 2;
                } else {
                  nbits_est += 4096;
                }

                a >>>= 1;
                b >>>= 1;

                if (lev < 3) {
                  ++lev;
                }
              }

              var pki = AC_SPEC_LOOKUP[t + (lev << 10 >>> 0)];
              var sym = a + (b << 2 >>> 0);
              nbits_est += AC_SPEC_BITS[pki][sym];

              if (a_lsb != 0) {
                nbits_est += 2048;
              }

              if (b_lsb != 0) {
                nbits_est += 2048;
              }

              if (lev > 0 && modeFlag == 1) {
                a_lsb >>>= 1;
                b_lsb >>>= 1;

                if (a_lsb == 0 && Xq_n0 != 0) {
                  ++nbits_lsb;
                }

                if (b_lsb == 0 && Xq_n1 != 0) {
                  ++nbits_lsb;
                }
              }

              if ((Xq_n0 != 0 || Xq_n1 != 0) && nbits_est <= nbits_spec << 11 >>> 0) {
                lastnz_trunc = _n27 + 2;
                nbits_trunc = nbits_est;
              }

              if (lev <= 1) {
                t = 1 + (a + b) * (lev + 1);
              } else {
                t = 12 + lev;
              }

              c = ((c & 15) << 4 >>> 0) + t;
            }

            if ((nbits_est & 2047) != 0) {
              nbits_est >>>= 11;
              ++nbits_est;
            } else {
              nbits_est >>>= 11;
            }

            nbits_est += nbits_lsb;

            if ((nbits_trunc & 2047) != 0) {
              nbits_trunc >>>= 11;
              ++nbits_trunc;
            } else {
              nbits_trunc >>>= 11;
            }
          }
          {
            for (var _k50 = lastnz_trunc; _k50 < lastnz; ++_k50) {
              Xq[_k50] = 0;
            }
          }
          {
            if (modeFlag == 1 && nbits_est > nbits_spec) {
              lsbMode = 1;
            } else {
              lsbMode = 0;
            }
          }

          if (first_quantize) {
            nbits_est_prior_requantize = nbits_est;
            {
              var delta = void 0;

              if (nbits_est < gg_t1_fsi) {
                delta = (nbits_est + 48) / 16;
              } else if (nbits_est < gg_t2_fsi) {
                var tmp1 = gg_t1_fsi / 16 + 3;
                var tmp2 = gg_t2_fsi / 48;
                delta = (nbits_est - gg_t1_fsi) * (tmp2 - tmp1);
                delta /= gg_t2_fsi - gg_t1_fsi;
                delta += tmp1;
              } else if (nbits_est < gg_t3_fsi) {
                delta = nbits_est / 48;
              } else {
                delta = gg_t3_fsi / 48;
              }

              delta = Math.round(delta);
              var delta2 = delta + 2;

              if (gg_ind < 255 && nbits_est > nbits_spec || gg_ind > 0 && nbits_est < nbits_spec - delta2) {
                if (nbits_est < nbits_spec - delta2) {
                  --gg_ind;
                } else if (gg_ind == 254 || nbits_est < nbits_spec + delta) {
                  ++gg_ind;
                } else {
                  gg_ind += 2;
                }

                if (gg_ind < gg_min) {
                  gg_ind = gg_min;
                }

                requantize = true;
              }
            }
          } else {
            requantize = false;
          }

          first_quantize = false;
        }

        reset_offset_old = reset_offset;
        nbits_offset_old = nbits_offset;
        nbits_spec_old = nbits_spec;
        nbits_est_old = nbits_est_prior_requantize;
      };

      this.getQuantizedSpectrumCoefficients = function () {
        return Xq;
      };

      this.getQuantizedParameters = function () {
        var R = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Array(9);

        if (R.length != 9) {
          throw new LC3IllegalParameterError("R has an incorrect size (!= 9).");
        }

        R[0] = gg;
        R[1] = gg_ind;
        R[2] = lastnz_trunc;
        R[3] = rateFlag;
        R[4] = modeFlag;
        R[5] = nbits_spec;
        R[6] = nbits_trunc;
        R[7] = nbits_ari_base;
        R[8] = lsbMode;
        return R;
      };
    }

    module.exports = {
      "LC3SpectralQuantization": LC3SpectralQuantization
    };
  },
  "lc3/encoder/tns": function lc3EncoderTns(module, require) {
    var Lc3Fs = require("./../common/fs");

    var Lc3Nms = require("./../common/nms");

    var Lc3TblNF = require("./../tables/nf");

    var Lc3TblTns = require("./../tables/tns");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var AC_TNS_ORDER_BITS = Lc3TblTns.AC_TNS_ORDER_BITS;
    var AC_TNS_COEF_BITS = Lc3TblTns.AC_TNS_COEF_BITS;
    var TNS_PARAM_NUM_TNS_FILTERS = Lc3TblTns.TNS_PARAM_NUM_TNS_FILTERS;
    var TNS_PARAM_START_FREQ = Lc3TblTns.TNS_PARAM_START_FREQ;
    var TNS_PARAM_STOP_FREQ = Lc3TblTns.TNS_PARAM_STOP_FREQ;
    var TNS_PARAM_SUB_START = Lc3TblTns.TNS_PARAM_SUB_START;
    var TNS_PARAM_SUB_STOP = Lc3TblTns.TNS_PARAM_SUB_STOP;
    var TNS_LPC_WEIGHTING_TH = Lc3TblTns.TNS_LPC_WEIGHTING_TH;
    var NF_TBL = Lc3TblNF.NF_TBL;
    var RCQ_C1 = 5.41126806512444158;
    var RCQ_C2 = 0.18479956785822313;

    function LC3TemporalNoiseShapingEncoder(Nms, Fs) {
      var index_Nms = Nms.getInternalIndex();
      var index_Fs = Fs.getInternalIndex();
      var NF = NF_TBL[index_Nms][index_Fs];
      var tns_lpc_weighting_th = TNS_LPC_WEIGHTING_TH[index_Nms];
      var R = new Array(9);
      var Es = new Array(3);
      var LPCs = new Array(9);
      var LPCs_tmp1 = new Array(9);
      var LPCs_tmp2 = new Array(9);
      var RC = [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]];
      var RCint = [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]];
      var RCq = [[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]];
      var RCorder = [0, 0];
      var Xf = new Array(NF);
      var nbitsTNS = 0;
      var st = new Array(8);
      var tns_lpc_weighting = 0;
      var num_tns_filters = 0;

      this.update = function (Xs, Pbw, nn_flag, nbits) {
        tns_lpc_weighting = nbits < tns_lpc_weighting_th ? 1 : 0;

        for (var k = 0; k < 8; ++k) {
          st[k] = 0;
        }

        for (var _k51 = 0; _k51 < NF; ++_k51) {
          Xf[_k51] = Xs[_k51];
        }

        num_tns_filters = TNS_PARAM_NUM_TNS_FILTERS[index_Nms][Pbw];
        var start_freqs = TNS_PARAM_START_FREQ[index_Nms][Pbw];
        var stop_freqs = TNS_PARAM_STOP_FREQ[index_Nms][Pbw];
        var sub_starts = TNS_PARAM_SUB_START[index_Nms][Pbw];
        var sub_stops = TNS_PARAM_SUB_STOP[index_Nms][Pbw];

        for (var f = 0; f < num_tns_filters; ++f) {
          var RC_f = RC[f];
          var sub_start = sub_starts[f];
          var sub_stop = sub_stops[f];
          var Es_accmul = void 0;
          {
            Es_accmul = 1;

            for (var s = 0; s < 3; ++s) {
              var sum = 0;
              var n1 = sub_start[s],
                  n2 = sub_stop[s];

              for (var n = n1; n < n2; ++n) {
                var tmp = Xs[n];
                sum += tmp * tmp;
              }

              Es[s] = sum;
              Es_accmul *= sum;

              if (Es_accmul > 1) {
                Es_accmul = 1;
              }
            }

            if (Es_accmul < 1e-31) {
              R[0] = 3;
              R[1] = 0;
              R[2] = 0;
              R[3] = 0;
              R[4] = 0;
              R[5] = 0;
              R[6] = 0;
              R[7] = 0;
              R[8] = 0;
            } else {
              for (var _k52 = 0; _k52 < 9; ++_k52) {
                var _sum = 0;

                for (var _s = 0; _s < 3; ++_s) {
                  var _tmp15 = 0;

                  var _n28 = sub_start[_s],
                      _n29 = sub_stop[_s] - _k52;

                  for (var _n30 = _n28; _n30 < _n29; ++_n30) {
                    _tmp15 += Xs[_n30] * Xs[_n30 + _k52];
                  }

                  _sum += _tmp15 / Es[_s];
                }

                R[_k52] = _sum;
              }
            }
          }
          {
            R[1] *= 0.9980280260203829;
            R[2] *= 0.9921354055113971;
            R[3] *= 0.9823915844707989;
            R[4] *= 0.9689107911912967;
            R[5] *= 0.9518498073692735;
            R[6] *= 0.9314049334023056;
            R[7] *= 0.9078082299969592;
            R[8] *= 0.8813231366694713;
          }
          var LPC_err = void 0;
          {
            var LPC_badflag = false;
            LPC_err = R[0];
            LPCs[0] = 1;

            for (var _k53 = 1; _k53 < 9; ++_k53) {
              var rc = 0;

              for (var _n31 = 0; _n31 < _k53; ++_n31) {
                rc += LPCs[_n31] * R[_k53 - _n31];
              }

              if (LPC_err < 1e-31) {
                LPC_badflag = true;
                break;
              }

              rc = -rc / LPC_err;
              LPCs_tmp1[0] = 1;

              for (var _n32 = 1; _n32 < _k53; ++_n32) {
                LPCs_tmp1[_n32] = LPCs[_n32] + rc * LPCs[_k53 - _n32];
              }

              LPCs_tmp1[_k53] = rc;

              for (var _n33 = 0; _n33 <= _k53; ++_n33) {
                LPCs[_n33] = LPCs_tmp1[_n33];
              }

              LPC_err *= 1 - rc * rc;
            }

            if (LPC_badflag) {
              RC_f[0] = 0;
              RC_f[1] = 0;
              RC_f[2] = 0;
              RC_f[3] = 0;
              RC_f[4] = 0;
              RC_f[5] = 0;
              RC_f[6] = 0;
              RC_f[7] = 0;
              continue;
            }
          }
          var pred_gain = void 0;
          {
            pred_gain = R[0] / LPC_err;
          }
          {
            if (pred_gain > 1.5 && nn_flag == 0) {
              if (tns_lpc_weighting == 1 && pred_gain < 2) {
                var gamma = 1 - 0.3 * (2 - pred_gain);
                var factor = gamma;
                LPCs[1] *= factor;
                factor *= gamma;
                LPCs[2] *= factor;
                factor *= gamma;
                LPCs[3] *= factor;
                factor *= gamma;
                LPCs[4] *= factor;
                factor *= gamma;
                LPCs[5] *= factor;
                factor *= gamma;
                LPCs[6] *= factor;
                factor *= gamma;
                LPCs[7] *= factor;
                factor *= gamma;
                LPCs[8] *= factor;
              }

              LPCs_tmp1[0] = LPCs[0];
              LPCs_tmp1[1] = LPCs[1];
              LPCs_tmp1[2] = LPCs[2];
              LPCs_tmp1[3] = LPCs[3];
              LPCs_tmp1[4] = LPCs[4];
              LPCs_tmp1[5] = LPCs[5];
              LPCs_tmp1[6] = LPCs[6];
              LPCs_tmp1[7] = LPCs[7];
              LPCs_tmp1[8] = LPCs[8];

              for (var _k54 = 8; _k54 >= 1; --_k54) {
                var LPCs_tmp1_k = LPCs_tmp1[_k54];
                RC_f[_k54 - 1] = LPCs_tmp1_k;
                var e = 1 - LPCs_tmp1_k * LPCs_tmp1_k;

                for (var _n34 = 1; _n34 < _k54; ++_n34) {
                  LPCs_tmp2[_n34] = (LPCs_tmp1[_n34] - LPCs_tmp1_k * LPCs_tmp1[_k54 - _n34]) / e;
                }

                for (var _n35 = 1; _n35 < _k54; ++_n35) {
                  LPCs_tmp1[_n35] = LPCs_tmp2[_n35];
                }
              }
            } else {
              RC_f[0] = 0;
              RC_f[1] = 0;
              RC_f[2] = 0;
              RC_f[3] = 0;
              RC_f[4] = 0;
              RC_f[5] = 0;
              RC_f[6] = 0;
              RC_f[7] = 0;
            }
          }
        }

        for (var _f7 = num_tns_filters; _f7 < 2; ++_f7) {
          var _RC_f = RC[_f7];
          _RC_f[0] = 0;
          _RC_f[1] = 0;
          _RC_f[2] = 0;
          _RC_f[3] = 0;
          _RC_f[4] = 0;
          _RC_f[5] = 0;
          _RC_f[6] = 0;
          _RC_f[7] = 0;
        }

        nbitsTNS = 0;

        for (var _f8 = 0; _f8 < 2; ++_f8) {
          var _RC_f2 = RC[_f8];
          var RCint_f = RCint[_f8];
          var RCq_f = RCq[_f8];
          {
            var _tmp16 = void 0;

            _tmp16 = Math.round(Math.asin(_RC_f2[0]) * RCQ_C1);
            RCint_f[0] = _tmp16 + 8;
            RCq_f[0] = Math.sin(_tmp16 * RCQ_C2);
            _tmp16 = Math.round(Math.asin(_RC_f2[1]) * RCQ_C1);
            RCint_f[1] = _tmp16 + 8;
            RCq_f[1] = Math.sin(_tmp16 * RCQ_C2);
            _tmp16 = Math.round(Math.asin(_RC_f2[2]) * RCQ_C1);
            RCint_f[2] = _tmp16 + 8;
            RCq_f[2] = Math.sin(_tmp16 * RCQ_C2);
            _tmp16 = Math.round(Math.asin(_RC_f2[3]) * RCQ_C1);
            RCint_f[3] = _tmp16 + 8;
            RCq_f[3] = Math.sin(_tmp16 * RCQ_C2);
            _tmp16 = Math.round(Math.asin(_RC_f2[4]) * RCQ_C1);
            RCint_f[4] = _tmp16 + 8;
            RCq_f[4] = Math.sin(_tmp16 * RCQ_C2);
            _tmp16 = Math.round(Math.asin(_RC_f2[5]) * RCQ_C1);
            RCint_f[5] = _tmp16 + 8;
            RCq_f[5] = Math.sin(_tmp16 * RCQ_C2);
            _tmp16 = Math.round(Math.asin(_RC_f2[6]) * RCQ_C1);
            RCint_f[6] = _tmp16 + 8;
            RCq_f[6] = Math.sin(_tmp16 * RCQ_C2);
            _tmp16 = Math.round(Math.asin(_RC_f2[7]) * RCQ_C1);
            RCint_f[7] = _tmp16 + 8;
            RCq_f[7] = Math.sin(_tmp16 * RCQ_C2);
          }
          {
            var _k55 = 7;

            while (_k55 >= 0 && Math.abs(RCq_f[_k55]) < 1e-31) {
              --_k55;
            }

            RCorder[_f8] = _k55 + 1;
          }
        }

        for (var _f9 = 0; _f9 < num_tns_filters; ++_f9) {
          var _RCint_f = RCint[_f9];
          var _RCq_f2 = RCq[_f9];
          var RCorderS1 = RCorder[_f9] - 1;
          {
            var nbitsTNSorder = void 0;

            if (RCorderS1 >= 0) {
              nbitsTNSorder = AC_TNS_ORDER_BITS[tns_lpc_weighting][RCorderS1];
            } else {
              nbitsTNSorder = 0;
            }

            var nbitsTNScoef = 0;

            for (var v = 0; v <= RCorderS1; ++v) {
              nbitsTNScoef += AC_TNS_COEF_BITS[v][_RCint_f[v]];
            }

            var _tmp17 = 2048 + nbitsTNSorder + nbitsTNScoef;

            if ((_tmp17 & 2047) != 0) {
              _tmp17 >>>= 11;
              ++_tmp17;
            } else {
              _tmp17 >>>= 11;
            }

            nbitsTNS += _tmp17;
          }
          {
            if (RCorderS1 >= 0) {
              var start_freq = start_freqs[_f9],
                  stop_freq = stop_freqs[_f9];

              for (var _n36 = start_freq; _n36 < stop_freq; ++_n36) {
                var t = Xs[_n36];
                var st_save = t;

                for (var _k56 = 0; _k56 < RCorderS1; ++_k56) {
                  var RCq_f_k = _RCq_f2[_k56];
                  var st_k = st[_k56];
                  var st_tmp = RCq_f_k * t + st_k;
                  t += RCq_f_k * st_k;
                  st[_k56] = st_save;
                  st_save = st_tmp;
                }

                t += _RCq_f2[RCorderS1] * st[RCorderS1];
                st[RCorderS1] = st_save;
                Xf[_n36] = t;
              }
            }
          }
        }
      };

      this.getBitConsumption = function () {
        return nbitsTNS;
      };

      this.getLpcWeighting = function () {
        return tns_lpc_weighting;
      };

      this.getFilteredSpectrumCoefficients = function () {
        return Xf;
      };

      this.getRcCount = function () {
        return num_tns_filters;
      };

      this.getRcOrders = function () {
        return RCorder;
      };

      this.getRcCoefficients = function () {
        return RCq;
      };

      this.getRcIndices = function () {
        return RCint;
      };
    }

    module.exports = {
      "LC3TemporalNoiseShapingEncoder": LC3TemporalNoiseShapingEncoder
    };
  },
  "lc3/math/brp": function lc3MathBrp(module, require) {
    var Lc3Error = require("./../error");

    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;

    function NewBitReversalPermutate(nbits) {
      if (!(Number.isInteger(nbits) && nbits >= 0 && nbits < 32)) {
        throw new LC3IllegalParameterError("Invalid bit count.");
      }

      if (nbits == 0) {
        return [];
      }

      var t = new Array(1 << nbits >>> 0);
      t[0] = 0;

      if (nbits > 0) {
        var msb = 1 << nbits - 1 >>> 0;
        var l = 1;
        var k = 1;

        for (var q = 1; q <= nbits; ++q) {
          for (var i = 0; i < l; ++i) {
            if ((k & 1) >>> 0 == 1) {
              t[k] = t[k - 1] + msb;
            } else {
              t[k] = t[k >>> 1] >>> 1;
            }

            ++k;
          }

          l = l << 1 >>> 0;
        }
      }

      return t;
    }

    module.exports = {
      "NewBitReversalPermutate": NewBitReversalPermutate
    };
  },
  "lc3/math/fft-mx-60": function lc3MathFftMx60(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr3 = Lc3FftMxBaseOp.MXTr3;
    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 12, 30, 7, 27, 28, 40, 2, 24, 49, 53, 44, 50, 8, 39, 58, 47, 29, 52, 32, 31, 19, 57, 35, 10, 6, 15, 9, 51, 20];
    var CSHFT_INDEXES_1 = [3, 36, 22, 25, 4, 48, 41, 14, 54, 56, 23, 37, 34, 55, 11, 18, 45, 5];
    var CSHFT_INDEXES_2 = [13, 42, 26, 16, 21];
    var CSHFT_INDEXES_3 = [17, 33, 43, 38, 46];

    function ApplyMixedRadixFFT_60(re, im) {
      MXTr5(re, im, 0, 12, 24, 36, 48);
      MXTr5(re, im, 1, 13, 25, 37, 49);
      MXTr5(re, im, 2, 14, 26, 38, 50);
      MXTr5(re, im, 3, 15, 27, 39, 51);
      MXTr5(re, im, 4, 16, 28, 40, 52);
      MXTr5(re, im, 5, 17, 29, 41, 53);
      MXTr5(re, im, 6, 18, 30, 42, 54);
      MXTr5(re, im, 7, 19, 31, 43, 55);
      MXTr5(re, im, 8, 20, 32, 44, 56);
      MXTr5(re, im, 9, 21, 33, 45, 57);
      MXTr5(re, im, 10, 22, 34, 46, 58);
      MXTr5(re, im, 11, 23, 35, 47, 59);
      MXRot(re, im, 13, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 14, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 15, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 16, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 17, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 18, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 19, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 20, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 21, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 22, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 23, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 25, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 26, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 27, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 28, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 29, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 30, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 31, 0.10452846326765368, -0.9945218953682733);
      MXRot(re, im, 32, -0.10452846326765333, -0.9945218953682734);
      MXRot(re, im, 33, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 34, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 35, -0.6691306063588579, -0.7431448254773945);
      MXRot(re, im, 37, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 38, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 39, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 40, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 41, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 42, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 43, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 44, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 45, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 46, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 47, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 49, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 50, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 51, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 52, -0.10452846326765333, -0.9945218953682734);
      MXRot(re, im, 53, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 54, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 55, -0.9781476007338056, -0.20791169081775973);
      MXRot(re, im, 56, -0.9781476007338057, 0.20791169081775907);
      MXRot(re, im, 57, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 58, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 59, -0.10452846326765423, 0.9945218953682733);
      MXTr4(re, im, 0, 3, 6, 9);
      MXTr4(re, im, 1, 4, 7, 10);
      MXTr4(re, im, 2, 5, 8, 11);
      MXRot(re, im, 4, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 5, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 7, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 8, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 10, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 11, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 0, 1, 2);
      MXTr3(re, im, 3, 4, 5);
      MXTr3(re, im, 6, 7, 8);
      MXTr3(re, im, 9, 10, 11);
      MXTr4(re, im, 12, 15, 18, 21);
      MXTr4(re, im, 13, 16, 19, 22);
      MXTr4(re, im, 14, 17, 20, 23);
      MXRot(re, im, 16, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 17, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 19, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 20, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 22, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 23, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 12, 13, 14);
      MXTr3(re, im, 15, 16, 17);
      MXTr3(re, im, 18, 19, 20);
      MXTr3(re, im, 21, 22, 23);
      MXTr4(re, im, 24, 27, 30, 33);
      MXTr4(re, im, 25, 28, 31, 34);
      MXTr4(re, im, 26, 29, 32, 35);
      MXRot(re, im, 28, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 29, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 31, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 32, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 34, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 35, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 24, 25, 26);
      MXTr3(re, im, 27, 28, 29);
      MXTr3(re, im, 30, 31, 32);
      MXTr3(re, im, 33, 34, 35);
      MXTr4(re, im, 36, 39, 42, 45);
      MXTr4(re, im, 37, 40, 43, 46);
      MXTr4(re, im, 38, 41, 44, 47);
      MXRot(re, im, 40, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 41, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 43, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 44, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 46, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 47, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 36, 37, 38);
      MXTr3(re, im, 39, 40, 41);
      MXTr3(re, im, 42, 43, 44);
      MXTr3(re, im, 45, 46, 47);
      MXTr4(re, im, 48, 51, 54, 57);
      MXTr4(re, im, 49, 52, 55, 58);
      MXTr4(re, im, 50, 53, 56, 59);
      MXRot(re, im, 52, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 53, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 55, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 56, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 58, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 59, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 48, 49, 50);
      MXTr3(re, im, 51, 52, 53);
      MXTr3(re, im, 54, 55, 56);
      MXTr3(re, im, 57, 58, 59);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
    }

    module.exports = {
      "ApplyMixedRadixFFT_60": ApplyMixedRadixFFT_60
    };
  },
  "lc3/math/fft-mx-80": function lc3MathFftMx80(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 16, 28, 53, 58, 62, 35, 13, 56, 30, 9, 68, 55, 14, 72, 43, 50, 10, 8, 52, 42, 34, 73, 59, 78, 63, 51, 26, 21, 17, 44, 66, 23, 49, 70, 11, 24, 65, 7, 36, 29, 69, 71, 27, 37, 45, 6, 20];
    var CSHFT_INDEXES_1 = [2, 32, 41, 18, 60, 3, 48, 54, 74, 75, 15, 12, 40];
    var CSHFT_INDEXES_2 = [4, 64, 67, 39, 77, 47, 38, 61, 19, 76, 31, 25, 5];
    var CSHFT_INDEXES_3 = [22, 33, 57, 46];

    function ApplyMixedRadixFFT_80(re, im) {
      MXTr5(re, im, 0, 16, 32, 48, 64);
      MXTr5(re, im, 1, 17, 33, 49, 65);
      MXTr5(re, im, 2, 18, 34, 50, 66);
      MXTr5(re, im, 3, 19, 35, 51, 67);
      MXTr5(re, im, 4, 20, 36, 52, 68);
      MXTr5(re, im, 5, 21, 37, 53, 69);
      MXTr5(re, im, 6, 22, 38, 54, 70);
      MXTr5(re, im, 7, 23, 39, 55, 71);
      MXTr5(re, im, 8, 24, 40, 56, 72);
      MXTr5(re, im, 9, 25, 41, 57, 73);
      MXTr5(re, im, 10, 26, 42, 58, 74);
      MXTr5(re, im, 11, 27, 43, 59, 75);
      MXTr5(re, im, 12, 28, 44, 60, 76);
      MXTr5(re, im, 13, 29, 45, 61, 77);
      MXTr5(re, im, 14, 30, 46, 62, 78);
      MXTr5(re, im, 15, 31, 47, 63, 79);
      MXRot(re, im, 17, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 18, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 19, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 20, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 21, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 22, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 23, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 24, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 25, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 26, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 27, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 28, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 29, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 30, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 31, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 33, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 34, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 35, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 36, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 37, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 38, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 39, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 40, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 41, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 42, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 43, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 44, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 45, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 46, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 47, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 49, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 50, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 51, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 52, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 53, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 54, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 55, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 56, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 57, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 58, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 59, -0.8526401643540922, -0.5224985647159489);
      MXRot(re, im, 60, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 61, -0.996917333733128, -0.07845909572784507);
      MXRot(re, im, 62, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 63, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 65, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 66, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 67, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 68, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 69, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 70, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 71, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 72, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 73, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 74, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 75, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 76, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 77, -0.5877852522924732, 0.8090169943749473);
      MXRot(re, im, 78, -0.30901699437494756, 0.9510565162951535);
      MXRot(re, im, 79, -1.8369701987210297e-16, 1.0);
      MXTr4(re, im, 0, 4, 8, 12);
      MXTr4(re, im, 1, 5, 9, 13);
      MXTr4(re, im, 2, 6, 10, 14);
      MXTr4(re, im, 3, 7, 11, 15);
      MXRot(re, im, 5, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 6, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 7, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 9, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 10, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 11, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 13, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 14, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 15, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 0, 1, 2, 3);
      MXTr4(re, im, 4, 5, 6, 7);
      MXTr4(re, im, 8, 9, 10, 11);
      MXTr4(re, im, 12, 13, 14, 15);
      MXTr4(re, im, 16, 20, 24, 28);
      MXTr4(re, im, 17, 21, 25, 29);
      MXTr4(re, im, 18, 22, 26, 30);
      MXTr4(re, im, 19, 23, 27, 31);
      MXRot(re, im, 21, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 22, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 23, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 25, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 26, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 27, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 29, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 30, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 31, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 16, 17, 18, 19);
      MXTr4(re, im, 20, 21, 22, 23);
      MXTr4(re, im, 24, 25, 26, 27);
      MXTr4(re, im, 28, 29, 30, 31);
      MXTr4(re, im, 32, 36, 40, 44);
      MXTr4(re, im, 33, 37, 41, 45);
      MXTr4(re, im, 34, 38, 42, 46);
      MXTr4(re, im, 35, 39, 43, 47);
      MXRot(re, im, 37, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 38, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 39, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 41, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 42, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 43, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 45, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 46, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 47, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 32, 33, 34, 35);
      MXTr4(re, im, 36, 37, 38, 39);
      MXTr4(re, im, 40, 41, 42, 43);
      MXTr4(re, im, 44, 45, 46, 47);
      MXTr4(re, im, 48, 52, 56, 60);
      MXTr4(re, im, 49, 53, 57, 61);
      MXTr4(re, im, 50, 54, 58, 62);
      MXTr4(re, im, 51, 55, 59, 63);
      MXRot(re, im, 53, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 54, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 55, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 57, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 58, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 59, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 61, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 62, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 63, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 48, 49, 50, 51);
      MXTr4(re, im, 52, 53, 54, 55);
      MXTr4(re, im, 56, 57, 58, 59);
      MXTr4(re, im, 60, 61, 62, 63);
      MXTr4(re, im, 64, 68, 72, 76);
      MXTr4(re, im, 65, 69, 73, 77);
      MXTr4(re, im, 66, 70, 74, 78);
      MXTr4(re, im, 67, 71, 75, 79);
      MXRot(re, im, 69, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 70, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 71, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 73, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 74, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 75, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 77, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 78, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 79, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 64, 65, 66, 67);
      MXTr4(re, im, 68, 69, 70, 71);
      MXTr4(re, im, 72, 73, 74, 75);
      MXTr4(re, im, 76, 77, 78, 79);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
    }

    module.exports = {
      "ApplyMixedRadixFFT_80": ApplyMixedRadixFFT_80
    };
  },
  "lc3/math/fft-mx-120": function lc3MathFftMx120(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr2 = Lc3FftMxBaseOp.MXTr2;
    var MXTr3 = Lc3FftMxBaseOp.MXTr3;
    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXSwap = Lc3FftMxBaseOp.MXSwap;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 24, 98, 93, 87, 57, 70, 13, 84, 99, 117, 71, 37, 68, 79, 115, 23, 74, 109, 107, 59, 118, 95, 21, 26, 32, 62, 49, 106, 35, 20, 2, 48, 82, 51, 40, 4, 96, 45, 10, 12, 60];
    var CSHFT_INDEXES_1 = [3, 72, 61, 25, 8, 78, 91, 39, 116, 47, 58, 94, 111, 41, 28, 80];
    var CSHFT_INDEXES_2 = [5, 6, 30, 14, 108, 83, 75, 19, 114, 113, 89, 105, 11, 36, 44, 100];
    var CSHFT_INDEXES_3 = [7, 54, 112, 65];
    var CSHFT_INDEXES_4 = [9, 102, 53, 88, 81, 27, 56, 46, 34, 110, 17, 66, 31, 38, 92, 63, 73, 85];
    var CSHFT_INDEXES_5 = [15, 18, 90];
    var CSHFT_INDEXES_6 = [16, 42, 52, 64, 97, 69, 103, 77, 67, 55, 22, 50];
    var CSHFT_INDEXES_7 = [29, 104, 101];

    function ApplyMixedRadixFFT_120(re, im) {
      MXTr5(re, im, 0, 24, 48, 72, 96);
      MXTr5(re, im, 1, 25, 49, 73, 97);
      MXTr5(re, im, 2, 26, 50, 74, 98);
      MXTr5(re, im, 3, 27, 51, 75, 99);
      MXTr5(re, im, 4, 28, 52, 76, 100);
      MXTr5(re, im, 5, 29, 53, 77, 101);
      MXTr5(re, im, 6, 30, 54, 78, 102);
      MXTr5(re, im, 7, 31, 55, 79, 103);
      MXTr5(re, im, 8, 32, 56, 80, 104);
      MXTr5(re, im, 9, 33, 57, 81, 105);
      MXTr5(re, im, 10, 34, 58, 82, 106);
      MXTr5(re, im, 11, 35, 59, 83, 107);
      MXTr5(re, im, 12, 36, 60, 84, 108);
      MXTr5(re, im, 13, 37, 61, 85, 109);
      MXTr5(re, im, 14, 38, 62, 86, 110);
      MXTr5(re, im, 15, 39, 63, 87, 111);
      MXTr5(re, im, 16, 40, 64, 88, 112);
      MXTr5(re, im, 17, 41, 65, 89, 113);
      MXTr5(re, im, 18, 42, 66, 90, 114);
      MXTr5(re, im, 19, 43, 67, 91, 115);
      MXTr5(re, im, 20, 44, 68, 92, 116);
      MXTr5(re, im, 21, 45, 69, 93, 117);
      MXTr5(re, im, 22, 46, 70, 94, 118);
      MXTr5(re, im, 23, 47, 71, 95, 119);
      MXRot(re, im, 25, 0.9986295347545738, -0.05233595624294383);
      MXRot(re, im, 26, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 27, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 28, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 29, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 30, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 31, 0.9335804264972017, -0.3583679495453002);
      MXRot(re, im, 32, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 33, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 34, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 35, 0.838670567945424, -0.544639035015027);
      MXRot(re, im, 36, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 37, 0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 38, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 39, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 40, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 41, 0.6293203910498375, -0.7771459614569708);
      MXRot(re, im, 42, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 43, 0.5446390350150272, -0.8386705679454239);
      MXRot(re, im, 44, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 45, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 46, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 47, 0.3583679495453004, -0.9335804264972017);
      MXRot(re, im, 49, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 50, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 51, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 52, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 53, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 54, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 55, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 56, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 57, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 58, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 59, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 60, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 61, 0.20791169081775945, -0.9781476007338056);
      MXRot(re, im, 62, 0.10452846326765368, -0.9945218953682733);
      MXRot(re, im, 63, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 64, -0.10452846326765333, -0.9945218953682734);
      MXRot(re, im, 65, -0.20791169081775912, -0.9781476007338057);
      MXRot(re, im, 66, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 67, -0.40673664307580004, -0.913545457642601);
      MXRot(re, im, 68, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 69, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 70, -0.6691306063588579, -0.7431448254773945);
      MXRot(re, im, 71, -0.743144825477394, -0.6691306063588583);
      MXRot(re, im, 73, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 74, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 75, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 76, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 77, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 78, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 79, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 80, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 81, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 82, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 83, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 84, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 85, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 86, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 87, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 88, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 89, -0.8910065241883678, -0.45399049973954686);
      MXRot(re, im, 90, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 91, -0.9876883405951377, -0.15643446504023098);
      MXRot(re, im, 92, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 93, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 94, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 95, -0.8910065241883679, 0.4539904997395467);
      MXRot(re, im, 97, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 98, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 99, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 100, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 101, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 102, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 103, 0.10452846326765368, -0.9945218953682733);
      MXRot(re, im, 104, -0.10452846326765333, -0.9945218953682734);
      MXRot(re, im, 105, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 106, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 107, -0.6691306063588579, -0.7431448254773945);
      MXRot(re, im, 108, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 109, -0.9135454576426008, -0.40673664307580043);
      MXRot(re, im, 110, -0.9781476007338056, -0.20791169081775973);
      MXRot(re, im, 111, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 112, -0.9781476007338057, 0.20791169081775907);
      MXRot(re, im, 113, -0.9135454576426011, 0.4067366430757998);
      MXRot(re, im, 114, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 115, -0.6691306063588585, 0.743144825477394);
      MXRot(re, im, 116, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 117, -0.30901699437494756, 0.9510565162951535);
      MXRot(re, im, 118, -0.10452846326765423, 0.9945218953682733);
      MXRot(re, im, 119, 0.10452846326765299, 0.9945218953682734);
      MXTr4(re, im, 0, 6, 12, 18);
      MXTr4(re, im, 1, 7, 13, 19);
      MXTr4(re, im, 2, 8, 14, 20);
      MXTr4(re, im, 3, 9, 15, 21);
      MXTr4(re, im, 4, 10, 16, 22);
      MXTr4(re, im, 5, 11, 17, 23);
      MXRot(re, im, 7, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 8, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 9, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 10, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 11, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 13, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 14, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 15, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 16, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 17, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 19, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 20, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 21, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 22, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 23, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 0, 2, 4);
      MXTr3(re, im, 1, 3, 5);
      MXRot(re, im, 3, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 5, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 0, 1);
      MXTr2(re, im, 2, 3);
      MXTr2(re, im, 4, 5);
      MXTr3(re, im, 6, 8, 10);
      MXTr3(re, im, 7, 9, 11);
      MXRot(re, im, 9, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 11, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 6, 7);
      MXTr2(re, im, 8, 9);
      MXTr2(re, im, 10, 11);
      MXTr3(re, im, 12, 14, 16);
      MXTr3(re, im, 13, 15, 17);
      MXRot(re, im, 15, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 17, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 12, 13);
      MXTr2(re, im, 14, 15);
      MXTr2(re, im, 16, 17);
      MXTr3(re, im, 18, 20, 22);
      MXTr3(re, im, 19, 21, 23);
      MXRot(re, im, 21, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 23, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 18, 19);
      MXTr2(re, im, 20, 21);
      MXTr2(re, im, 22, 23);
      MXTr4(re, im, 24, 30, 36, 42);
      MXTr4(re, im, 25, 31, 37, 43);
      MXTr4(re, im, 26, 32, 38, 44);
      MXTr4(re, im, 27, 33, 39, 45);
      MXTr4(re, im, 28, 34, 40, 46);
      MXTr4(re, im, 29, 35, 41, 47);
      MXRot(re, im, 31, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 32, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 33, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 34, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 35, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 37, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 38, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 39, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 40, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 41, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 43, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 44, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 45, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 46, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 47, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 24, 26, 28);
      MXTr3(re, im, 25, 27, 29);
      MXRot(re, im, 27, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 29, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 24, 25);
      MXTr2(re, im, 26, 27);
      MXTr2(re, im, 28, 29);
      MXTr3(re, im, 30, 32, 34);
      MXTr3(re, im, 31, 33, 35);
      MXRot(re, im, 33, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 35, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 30, 31);
      MXTr2(re, im, 32, 33);
      MXTr2(re, im, 34, 35);
      MXTr3(re, im, 36, 38, 40);
      MXTr3(re, im, 37, 39, 41);
      MXRot(re, im, 39, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 41, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 36, 37);
      MXTr2(re, im, 38, 39);
      MXTr2(re, im, 40, 41);
      MXTr3(re, im, 42, 44, 46);
      MXTr3(re, im, 43, 45, 47);
      MXRot(re, im, 45, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 47, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 42, 43);
      MXTr2(re, im, 44, 45);
      MXTr2(re, im, 46, 47);
      MXTr4(re, im, 48, 54, 60, 66);
      MXTr4(re, im, 49, 55, 61, 67);
      MXTr4(re, im, 50, 56, 62, 68);
      MXTr4(re, im, 51, 57, 63, 69);
      MXTr4(re, im, 52, 58, 64, 70);
      MXTr4(re, im, 53, 59, 65, 71);
      MXRot(re, im, 55, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 56, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 57, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 58, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 59, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 61, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 62, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 63, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 64, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 65, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 67, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 68, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 69, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 70, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 71, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 48, 50, 52);
      MXTr3(re, im, 49, 51, 53);
      MXRot(re, im, 51, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 53, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 48, 49);
      MXTr2(re, im, 50, 51);
      MXTr2(re, im, 52, 53);
      MXTr3(re, im, 54, 56, 58);
      MXTr3(re, im, 55, 57, 59);
      MXRot(re, im, 57, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 59, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 54, 55);
      MXTr2(re, im, 56, 57);
      MXTr2(re, im, 58, 59);
      MXTr3(re, im, 60, 62, 64);
      MXTr3(re, im, 61, 63, 65);
      MXRot(re, im, 63, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 65, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 60, 61);
      MXTr2(re, im, 62, 63);
      MXTr2(re, im, 64, 65);
      MXTr3(re, im, 66, 68, 70);
      MXTr3(re, im, 67, 69, 71);
      MXRot(re, im, 69, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 71, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 66, 67);
      MXTr2(re, im, 68, 69);
      MXTr2(re, im, 70, 71);
      MXTr4(re, im, 72, 78, 84, 90);
      MXTr4(re, im, 73, 79, 85, 91);
      MXTr4(re, im, 74, 80, 86, 92);
      MXTr4(re, im, 75, 81, 87, 93);
      MXTr4(re, im, 76, 82, 88, 94);
      MXTr4(re, im, 77, 83, 89, 95);
      MXRot(re, im, 79, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 80, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 81, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 82, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 83, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 85, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 86, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 87, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 88, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 89, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 91, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 92, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 93, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 94, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 95, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 72, 74, 76);
      MXTr3(re, im, 73, 75, 77);
      MXRot(re, im, 75, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 77, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 72, 73);
      MXTr2(re, im, 74, 75);
      MXTr2(re, im, 76, 77);
      MXTr3(re, im, 78, 80, 82);
      MXTr3(re, im, 79, 81, 83);
      MXRot(re, im, 81, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 83, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 78, 79);
      MXTr2(re, im, 80, 81);
      MXTr2(re, im, 82, 83);
      MXTr3(re, im, 84, 86, 88);
      MXTr3(re, im, 85, 87, 89);
      MXRot(re, im, 87, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 89, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 84, 85);
      MXTr2(re, im, 86, 87);
      MXTr2(re, im, 88, 89);
      MXTr3(re, im, 90, 92, 94);
      MXTr3(re, im, 91, 93, 95);
      MXRot(re, im, 93, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 95, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 90, 91);
      MXTr2(re, im, 92, 93);
      MXTr2(re, im, 94, 95);
      MXTr4(re, im, 96, 102, 108, 114);
      MXTr4(re, im, 97, 103, 109, 115);
      MXTr4(re, im, 98, 104, 110, 116);
      MXTr4(re, im, 99, 105, 111, 117);
      MXTr4(re, im, 100, 106, 112, 118);
      MXTr4(re, im, 101, 107, 113, 119);
      MXRot(re, im, 103, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 104, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 105, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 106, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 107, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 109, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 110, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 111, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 112, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 113, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 115, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 116, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 117, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 118, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 119, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 96, 98, 100);
      MXTr3(re, im, 97, 99, 101);
      MXRot(re, im, 99, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 101, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 96, 97);
      MXTr2(re, im, 98, 99);
      MXTr2(re, im, 100, 101);
      MXTr3(re, im, 102, 104, 106);
      MXTr3(re, im, 103, 105, 107);
      MXRot(re, im, 105, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 107, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 102, 103);
      MXTr2(re, im, 104, 105);
      MXTr2(re, im, 106, 107);
      MXTr3(re, im, 108, 110, 112);
      MXTr3(re, im, 109, 111, 113);
      MXRot(re, im, 111, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 113, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 108, 109);
      MXTr2(re, im, 110, 111);
      MXTr2(re, im, 112, 113);
      MXTr3(re, im, 114, 116, 118);
      MXTr3(re, im, 115, 117, 119);
      MXRot(re, im, 117, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 119, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 114, 115);
      MXTr2(re, im, 116, 117);
      MXTr2(re, im, 118, 119);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
      MXCshft(re, im, CSHFT_INDEXES_4);
      MXCshft(re, im, CSHFT_INDEXES_5);
      MXCshft(re, im, CSHFT_INDEXES_6);
      MXCshft(re, im, CSHFT_INDEXES_7);
      MXSwap(re, im, 33, 86);
      MXSwap(re, im, 43, 76);
    }

    module.exports = {
      "ApplyMixedRadixFFT_120": ApplyMixedRadixFFT_120
    };
  },
  "lc3/math/fft-mx-160": function lc3MathFftMx160(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr2 = Lc3FftMxBaseOp.MXTr2;
    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 32, 82, 65, 14, 144, 135, 29, 138, 125, 13, 112, 83, 97, 89, 137, 93, 113, 115, 27, 74, 150, 23, 98, 121, 37, 90, 17, 88, 105, 11, 48, 108, 107, 75, 30, 18, 120, 5, 8, 104, 131, 53, 116, 59, 156, 63, 102, 67, 78, 126, 45, 12, 80];
    var CSHFT_INDEXES_1 = [2, 64, 134, 149, 143, 103, 99, 153, 119, 155, 31, 50, 20];
    var CSHFT_INDEXES_2 = [3, 96, 57, 92, 81, 33, 114, 147, 79, 158, 127, 77, 94, 145, 15, 24, 130, 21, 34, 146, 47, 76, 62, 70, 22, 66, 46, 44, 132, 85, 9, 136, 61, 38, 122, 69, 142, 71, 54, 148, 111, 51, 52, 84, 129, 141, 39, 154, 151, 55, 28, 106, 43, 100];
    var CSHFT_INDEXES_3 = [4, 128, 109, 139, 157, 95, 25, 10, 16, 56, 60, 6, 40];
    var CSHFT_INDEXES_4 = [7, 72, 86, 41, 36, 58, 124, 133, 117, 91, 49, 140];
    var CSHFT_INDEXES_5 = [19, 152, 87, 73, 118, 123, 101, 35, 26, 42, 68, 110];

    function ApplyMixedRadixFFT_160(re, im) {
      MXTr5(re, im, 0, 32, 64, 96, 128);
      MXTr5(re, im, 1, 33, 65, 97, 129);
      MXTr5(re, im, 2, 34, 66, 98, 130);
      MXTr5(re, im, 3, 35, 67, 99, 131);
      MXTr5(re, im, 4, 36, 68, 100, 132);
      MXTr5(re, im, 5, 37, 69, 101, 133);
      MXTr5(re, im, 6, 38, 70, 102, 134);
      MXTr5(re, im, 7, 39, 71, 103, 135);
      MXTr5(re, im, 8, 40, 72, 104, 136);
      MXTr5(re, im, 9, 41, 73, 105, 137);
      MXTr5(re, im, 10, 42, 74, 106, 138);
      MXTr5(re, im, 11, 43, 75, 107, 139);
      MXTr5(re, im, 12, 44, 76, 108, 140);
      MXTr5(re, im, 13, 45, 77, 109, 141);
      MXTr5(re, im, 14, 46, 78, 110, 142);
      MXTr5(re, im, 15, 47, 79, 111, 143);
      MXTr5(re, im, 16, 48, 80, 112, 144);
      MXTr5(re, im, 17, 49, 81, 113, 145);
      MXTr5(re, im, 18, 50, 82, 114, 146);
      MXTr5(re, im, 19, 51, 83, 115, 147);
      MXTr5(re, im, 20, 52, 84, 116, 148);
      MXTr5(re, im, 21, 53, 85, 117, 149);
      MXTr5(re, im, 22, 54, 86, 118, 150);
      MXTr5(re, im, 23, 55, 87, 119, 151);
      MXTr5(re, im, 24, 56, 88, 120, 152);
      MXTr5(re, im, 25, 57, 89, 121, 153);
      MXTr5(re, im, 26, 58, 90, 122, 154);
      MXTr5(re, im, 27, 59, 91, 123, 155);
      MXTr5(re, im, 28, 60, 92, 124, 156);
      MXTr5(re, im, 29, 61, 93, 125, 157);
      MXTr5(re, im, 30, 62, 94, 126, 158);
      MXTr5(re, im, 31, 63, 95, 127, 159);
      MXRot(re, im, 33, 0.9992290362407229, -0.03925981575906861);
      MXRot(re, im, 34, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 35, 0.9930684569549263, -0.11753739745783764);
      MXRot(re, im, 36, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 37, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 38, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 39, 0.9624552364536473, -0.27144044986507426);
      MXRot(re, im, 40, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 41, 0.9381913359224842, -0.34611705707749296);
      MXRot(re, im, 42, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 43, 0.9081431738250813, -0.4186597375374281);
      MXRot(re, im, 44, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 45, 0.8724960070727972, -0.4886212414969549);
      MXRot(re, im, 46, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 47, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 48, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 49, 0.785316930880745, -0.619093949309834);
      MXRot(re, im, 50, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 51, 0.7343225094356856, -0.6788007455329417);
      MXRot(re, im, 52, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 53, 0.6788007455329418, -0.7343225094356856);
      MXRot(re, im, 54, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 55, 0.619093949309834, -0.785316930880745);
      MXRot(re, im, 56, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 57, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 58, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 59, 0.48862124149695496, -0.8724960070727971);
      MXRot(re, im, 60, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 61, 0.41865973753742813, -0.9081431738250813);
      MXRot(re, im, 62, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 63, 0.346117057077493, -0.9381913359224842);
      MXRot(re, im, 65, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 66, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 67, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 68, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 69, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 70, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 71, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 72, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 73, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 74, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 75, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 76, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 77, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 78, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 79, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 80, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 81, 0.23344536385590547, -0.9723699203976766);
      MXRot(re, im, 82, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 83, 0.078459095727845, -0.996917333733128);
      MXRot(re, im, 84, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 85, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 86, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 87, -0.23344536385590534, -0.9723699203976767);
      MXRot(re, im, 88, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 89, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 90, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 91, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 92, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 93, -0.6494480483301835, -0.760405965600031);
      MXRot(re, im, 94, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 95, -0.7604059656000309, -0.6494480483301838);
      MXRot(re, im, 97, 0.9930684569549263, -0.11753739745783764);
      MXRot(re, im, 98, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 99, 0.9381913359224842, -0.34611705707749296);
      MXRot(re, im, 100, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 101, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 102, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 103, 0.6788007455329418, -0.7343225094356856);
      MXRot(re, im, 104, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 105, 0.48862124149695496, -0.8724960070727971);
      MXRot(re, im, 106, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 107, 0.2714404498650743, -0.9624552364536473);
      MXRot(re, im, 108, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 109, 0.039259815759068666, -0.9992290362407229);
      MXRot(re, im, 110, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 111, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 112, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 113, -0.4186597375374278, -0.9081431738250815);
      MXRot(re, im, 114, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 115, -0.6190939493098341, -0.7853169308807448);
      MXRot(re, im, 116, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 117, -0.7853169308807447, -0.6190939493098342);
      MXRot(re, im, 118, -0.8526401643540922, -0.5224985647159489);
      MXRot(re, im, 119, -0.9081431738250814, -0.41865973753742797);
      MXRot(re, im, 120, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 121, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 122, -0.996917333733128, -0.07845909572784507);
      MXRot(re, im, 123, -0.9992290362407229, 0.03925981575906871);
      MXRot(re, im, 124, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 125, -0.9624552364536474, 0.27144044986507393);
      MXRot(re, im, 126, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 127, -0.8724960070727971, 0.488621241496955);
      MXRot(re, im, 129, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 130, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 131, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 132, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 133, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 134, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 135, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 136, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 137, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 138, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 139, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 140, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 141, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 142, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 143, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 144, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 145, -0.8910065241883678, -0.45399049973954686);
      MXRot(re, im, 146, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 147, -0.9876883405951377, -0.15643446504023098);
      MXRot(re, im, 148, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 149, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 150, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 151, -0.8910065241883679, 0.4539904997395467);
      MXRot(re, im, 152, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 153, -0.7071067811865477, 0.7071067811865475);
      MXRot(re, im, 154, -0.5877852522924732, 0.8090169943749473);
      MXRot(re, im, 155, -0.4539904997395469, 0.8910065241883678);
      MXRot(re, im, 156, -0.30901699437494756, 0.9510565162951535);
      MXRot(re, im, 157, -0.15643446504023104, 0.9876883405951377);
      MXRot(re, im, 158, -1.8369701987210297e-16, 1.0);
      MXRot(re, im, 159, 0.15643446504023067, 0.9876883405951378);
      MXTr4(re, im, 0, 8, 16, 24);
      MXTr4(re, im, 1, 9, 17, 25);
      MXTr4(re, im, 2, 10, 18, 26);
      MXTr4(re, im, 3, 11, 19, 27);
      MXTr4(re, im, 4, 12, 20, 28);
      MXTr4(re, im, 5, 13, 21, 29);
      MXTr4(re, im, 6, 14, 22, 30);
      MXTr4(re, im, 7, 15, 23, 31);
      MXRot(re, im, 9, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 10, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 11, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 12, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 13, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 14, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 15, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 17, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 18, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 19, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 20, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 21, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 22, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 23, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 25, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 26, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 27, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 28, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 29, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 30, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 31, -0.5555702330196022, 0.8314696123025452);
      MXTr4(re, im, 0, 2, 4, 6);
      MXTr4(re, im, 1, 3, 5, 7);
      MXRot(re, im, 3, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 5, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 7, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 0, 1);
      MXTr2(re, im, 2, 3);
      MXTr2(re, im, 4, 5);
      MXTr2(re, im, 6, 7);
      MXTr4(re, im, 8, 10, 12, 14);
      MXTr4(re, im, 9, 11, 13, 15);
      MXRot(re, im, 11, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 13, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 15, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 8, 9);
      MXTr2(re, im, 10, 11);
      MXTr2(re, im, 12, 13);
      MXTr2(re, im, 14, 15);
      MXTr4(re, im, 16, 18, 20, 22);
      MXTr4(re, im, 17, 19, 21, 23);
      MXRot(re, im, 19, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 21, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 23, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 16, 17);
      MXTr2(re, im, 18, 19);
      MXTr2(re, im, 20, 21);
      MXTr2(re, im, 22, 23);
      MXTr4(re, im, 24, 26, 28, 30);
      MXTr4(re, im, 25, 27, 29, 31);
      MXRot(re, im, 27, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 29, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 31, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 24, 25);
      MXTr2(re, im, 26, 27);
      MXTr2(re, im, 28, 29);
      MXTr2(re, im, 30, 31);
      MXTr4(re, im, 32, 40, 48, 56);
      MXTr4(re, im, 33, 41, 49, 57);
      MXTr4(re, im, 34, 42, 50, 58);
      MXTr4(re, im, 35, 43, 51, 59);
      MXTr4(re, im, 36, 44, 52, 60);
      MXTr4(re, im, 37, 45, 53, 61);
      MXTr4(re, im, 38, 46, 54, 62);
      MXTr4(re, im, 39, 47, 55, 63);
      MXRot(re, im, 41, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 42, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 43, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 44, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 45, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 46, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 47, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 49, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 50, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 51, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 52, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 53, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 54, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 55, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 57, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 58, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 59, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 60, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 61, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 62, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 63, -0.5555702330196022, 0.8314696123025452);
      MXTr4(re, im, 32, 34, 36, 38);
      MXTr4(re, im, 33, 35, 37, 39);
      MXRot(re, im, 35, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 37, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 39, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 32, 33);
      MXTr2(re, im, 34, 35);
      MXTr2(re, im, 36, 37);
      MXTr2(re, im, 38, 39);
      MXTr4(re, im, 40, 42, 44, 46);
      MXTr4(re, im, 41, 43, 45, 47);
      MXRot(re, im, 43, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 45, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 47, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 40, 41);
      MXTr2(re, im, 42, 43);
      MXTr2(re, im, 44, 45);
      MXTr2(re, im, 46, 47);
      MXTr4(re, im, 48, 50, 52, 54);
      MXTr4(re, im, 49, 51, 53, 55);
      MXRot(re, im, 51, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 53, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 55, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 48, 49);
      MXTr2(re, im, 50, 51);
      MXTr2(re, im, 52, 53);
      MXTr2(re, im, 54, 55);
      MXTr4(re, im, 56, 58, 60, 62);
      MXTr4(re, im, 57, 59, 61, 63);
      MXRot(re, im, 59, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 61, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 63, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 56, 57);
      MXTr2(re, im, 58, 59);
      MXTr2(re, im, 60, 61);
      MXTr2(re, im, 62, 63);
      MXTr4(re, im, 64, 72, 80, 88);
      MXTr4(re, im, 65, 73, 81, 89);
      MXTr4(re, im, 66, 74, 82, 90);
      MXTr4(re, im, 67, 75, 83, 91);
      MXTr4(re, im, 68, 76, 84, 92);
      MXTr4(re, im, 69, 77, 85, 93);
      MXTr4(re, im, 70, 78, 86, 94);
      MXTr4(re, im, 71, 79, 87, 95);
      MXRot(re, im, 73, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 74, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 75, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 76, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 77, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 78, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 79, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 81, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 82, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 83, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 84, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 85, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 86, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 87, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 89, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 90, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 91, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 92, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 93, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 94, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 95, -0.5555702330196022, 0.8314696123025452);
      MXTr4(re, im, 64, 66, 68, 70);
      MXTr4(re, im, 65, 67, 69, 71);
      MXRot(re, im, 67, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 69, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 71, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 64, 65);
      MXTr2(re, im, 66, 67);
      MXTr2(re, im, 68, 69);
      MXTr2(re, im, 70, 71);
      MXTr4(re, im, 72, 74, 76, 78);
      MXTr4(re, im, 73, 75, 77, 79);
      MXRot(re, im, 75, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 77, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 79, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 72, 73);
      MXTr2(re, im, 74, 75);
      MXTr2(re, im, 76, 77);
      MXTr2(re, im, 78, 79);
      MXTr4(re, im, 80, 82, 84, 86);
      MXTr4(re, im, 81, 83, 85, 87);
      MXRot(re, im, 83, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 85, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 87, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 80, 81);
      MXTr2(re, im, 82, 83);
      MXTr2(re, im, 84, 85);
      MXTr2(re, im, 86, 87);
      MXTr4(re, im, 88, 90, 92, 94);
      MXTr4(re, im, 89, 91, 93, 95);
      MXRot(re, im, 91, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 93, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 95, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 88, 89);
      MXTr2(re, im, 90, 91);
      MXTr2(re, im, 92, 93);
      MXTr2(re, im, 94, 95);
      MXTr4(re, im, 96, 104, 112, 120);
      MXTr4(re, im, 97, 105, 113, 121);
      MXTr4(re, im, 98, 106, 114, 122);
      MXTr4(re, im, 99, 107, 115, 123);
      MXTr4(re, im, 100, 108, 116, 124);
      MXTr4(re, im, 101, 109, 117, 125);
      MXTr4(re, im, 102, 110, 118, 126);
      MXTr4(re, im, 103, 111, 119, 127);
      MXRot(re, im, 105, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 106, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 107, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 108, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 109, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 110, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 111, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 113, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 114, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 115, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 116, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 117, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 118, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 119, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 121, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 122, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 123, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 124, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 125, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 126, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 127, -0.5555702330196022, 0.8314696123025452);
      MXTr4(re, im, 96, 98, 100, 102);
      MXTr4(re, im, 97, 99, 101, 103);
      MXRot(re, im, 99, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 101, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 103, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 96, 97);
      MXTr2(re, im, 98, 99);
      MXTr2(re, im, 100, 101);
      MXTr2(re, im, 102, 103);
      MXTr4(re, im, 104, 106, 108, 110);
      MXTr4(re, im, 105, 107, 109, 111);
      MXRot(re, im, 107, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 109, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 111, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 104, 105);
      MXTr2(re, im, 106, 107);
      MXTr2(re, im, 108, 109);
      MXTr2(re, im, 110, 111);
      MXTr4(re, im, 112, 114, 116, 118);
      MXTr4(re, im, 113, 115, 117, 119);
      MXRot(re, im, 115, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 117, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 119, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 112, 113);
      MXTr2(re, im, 114, 115);
      MXTr2(re, im, 116, 117);
      MXTr2(re, im, 118, 119);
      MXTr4(re, im, 120, 122, 124, 126);
      MXTr4(re, im, 121, 123, 125, 127);
      MXRot(re, im, 123, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 125, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 127, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 120, 121);
      MXTr2(re, im, 122, 123);
      MXTr2(re, im, 124, 125);
      MXTr2(re, im, 126, 127);
      MXTr4(re, im, 128, 136, 144, 152);
      MXTr4(re, im, 129, 137, 145, 153);
      MXTr4(re, im, 130, 138, 146, 154);
      MXTr4(re, im, 131, 139, 147, 155);
      MXTr4(re, im, 132, 140, 148, 156);
      MXTr4(re, im, 133, 141, 149, 157);
      MXTr4(re, im, 134, 142, 150, 158);
      MXTr4(re, im, 135, 143, 151, 159);
      MXRot(re, im, 137, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 138, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 139, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 140, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 141, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 142, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 143, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 145, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 146, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 147, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 148, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 149, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 150, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 151, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 153, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 154, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 155, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 156, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 157, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 158, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 159, -0.5555702330196022, 0.8314696123025452);
      MXTr4(re, im, 128, 130, 132, 134);
      MXTr4(re, im, 129, 131, 133, 135);
      MXRot(re, im, 131, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 133, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 135, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 128, 129);
      MXTr2(re, im, 130, 131);
      MXTr2(re, im, 132, 133);
      MXTr2(re, im, 134, 135);
      MXTr4(re, im, 136, 138, 140, 142);
      MXTr4(re, im, 137, 139, 141, 143);
      MXRot(re, im, 139, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 141, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 143, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 136, 137);
      MXTr2(re, im, 138, 139);
      MXTr2(re, im, 140, 141);
      MXTr2(re, im, 142, 143);
      MXTr4(re, im, 144, 146, 148, 150);
      MXTr4(re, im, 145, 147, 149, 151);
      MXRot(re, im, 147, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 149, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 151, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 144, 145);
      MXTr2(re, im, 146, 147);
      MXTr2(re, im, 148, 149);
      MXTr2(re, im, 150, 151);
      MXTr4(re, im, 152, 154, 156, 158);
      MXTr4(re, im, 153, 155, 157, 159);
      MXRot(re, im, 155, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 157, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 159, -0.7071067811865475, -0.7071067811865476);
      MXTr2(re, im, 152, 153);
      MXTr2(re, im, 154, 155);
      MXTr2(re, im, 156, 157);
      MXTr2(re, im, 158, 159);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
      MXCshft(re, im, CSHFT_INDEXES_4);
      MXCshft(re, im, CSHFT_INDEXES_5);
    }

    module.exports = {
      "ApplyMixedRadixFFT_160": ApplyMixedRadixFFT_160
    };
  },
  "lc3/math/fft-mx-180": function lc3MathFftMx180(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr3 = Lc3FftMxBaseOp.MXTr3;
    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 36, 66, 46, 51, 60];
    var CSHFT_INDEXES_1 = [2, 72, 91, 58, 141, 41, 42, 78, 136, 65, 10, 18, 135, 29, 156, 68, 118, 142, 77, 100, 7, 81, 40, 6, 45, 15, 27, 84, 148, 122, 74, 163, 116, 70, 19, 171, 62, 73, 127, 83, 112, 97, 103, 115, 34, 165, 17, 99, 175, 35, 30, 21, 39, 174, 170, 26, 48, 123, 110, 25, 12, 90, 22, 75, 28, 120];
    var CSHFT_INDEXES_2 = [3, 108, 124, 146, 50, 24, 147, 86, 49, 159, 176, 71, 55, 33, 129, 155, 32, 93, 130, 20];
    var CSHFT_INDEXES_3 = [4, 144, 149, 158, 140, 5, 9, 153, 131, 56, 69, 154, 167, 89, 157, 104, 151, 59, 177, 107, 88, 121, 38, 138, 137, 101, 43, 114, 169, 161, 44, 150, 23, 111, 61, 37, 102, 79, 172, 98, 139, 173, 134, 164, 152, 95, 31, 57, 105, 16, 63, 109, 160, 8, 117, 106, 52, 96, 67, 82, 76, 64, 145, 14, 162, 80];
    var CSHFT_INDEXES_4 = [11, 54, 168, 125];
    var CSHFT_INDEXES_5 = [13, 126, 47, 87, 85];
    var CSHFT_INDEXES_6 = [53, 132, 92, 94, 166];
    var CSHFT_INDEXES_7 = [113, 133, 128, 119, 178, 143];

    function ApplyMixedRadixFFT_180(re, im) {
      MXTr5(re, im, 0, 36, 72, 108, 144);
      MXTr5(re, im, 1, 37, 73, 109, 145);
      MXTr5(re, im, 2, 38, 74, 110, 146);
      MXTr5(re, im, 3, 39, 75, 111, 147);
      MXTr5(re, im, 4, 40, 76, 112, 148);
      MXTr5(re, im, 5, 41, 77, 113, 149);
      MXTr5(re, im, 6, 42, 78, 114, 150);
      MXTr5(re, im, 7, 43, 79, 115, 151);
      MXTr5(re, im, 8, 44, 80, 116, 152);
      MXTr5(re, im, 9, 45, 81, 117, 153);
      MXTr5(re, im, 10, 46, 82, 118, 154);
      MXTr5(re, im, 11, 47, 83, 119, 155);
      MXTr5(re, im, 12, 48, 84, 120, 156);
      MXTr5(re, im, 13, 49, 85, 121, 157);
      MXTr5(re, im, 14, 50, 86, 122, 158);
      MXTr5(re, im, 15, 51, 87, 123, 159);
      MXTr5(re, im, 16, 52, 88, 124, 160);
      MXTr5(re, im, 17, 53, 89, 125, 161);
      MXTr5(re, im, 18, 54, 90, 126, 162);
      MXTr5(re, im, 19, 55, 91, 127, 163);
      MXTr5(re, im, 20, 56, 92, 128, 164);
      MXTr5(re, im, 21, 57, 93, 129, 165);
      MXTr5(re, im, 22, 58, 94, 130, 166);
      MXTr5(re, im, 23, 59, 95, 131, 167);
      MXTr5(re, im, 24, 60, 96, 132, 168);
      MXTr5(re, im, 25, 61, 97, 133, 169);
      MXTr5(re, im, 26, 62, 98, 134, 170);
      MXTr5(re, im, 27, 63, 99, 135, 171);
      MXTr5(re, im, 28, 64, 100, 136, 172);
      MXTr5(re, im, 29, 65, 101, 137, 173);
      MXTr5(re, im, 30, 66, 102, 138, 174);
      MXTr5(re, im, 31, 67, 103, 139, 175);
      MXTr5(re, im, 32, 68, 104, 140, 176);
      MXTr5(re, im, 33, 69, 105, 141, 177);
      MXTr5(re, im, 34, 70, 106, 142, 178);
      MXTr5(re, im, 35, 71, 107, 143, 179);
      MXRot(re, im, 37, 0.9993908270190958, -0.03489949670250097);
      MXRot(re, im, 38, 0.9975640502598242, -0.0697564737441253);
      MXRot(re, im, 39, 0.9945218953682733, -0.10452846326765347);
      MXRot(re, im, 40, 0.9902680687415704, -0.13917310096006544);
      MXRot(re, im, 41, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 42, 0.9781476007338057, -0.20791169081775934);
      MXRot(re, im, 43, 0.9702957262759965, -0.24192189559966773);
      MXRot(re, im, 44, 0.9612616959383189, -0.27563735581699916);
      MXRot(re, im, 45, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 46, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 47, 0.9271838545667874, -0.374606593415912);
      MXRot(re, im, 48, 0.9135454576426009, -0.4067366430758002);
      MXRot(re, im, 49, 0.898794046299167, -0.4383711467890774);
      MXRot(re, im, 50, 0.882947592858927, -0.4694715627858908);
      MXRot(re, im, 51, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 52, 0.848048096156426, -0.5299192642332049);
      MXRot(re, im, 53, 0.8290375725550416, -0.5591929034707469);
      MXRot(re, im, 54, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 55, 0.7880107536067219, -0.6156614753256583);
      MXRot(re, im, 56, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 57, 0.7431448254773942, -0.6691306063588582);
      MXRot(re, im, 58, 0.7193398003386512, -0.6946583704589973);
      MXRot(re, im, 59, 0.6946583704589973, -0.7193398003386511);
      MXRot(re, im, 60, 0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 61, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 62, 0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 63, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 64, 0.5591929034707468, -0.8290375725550417);
      MXRot(re, im, 65, 0.5299192642332049, -0.848048096156426);
      MXRot(re, im, 66, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 67, 0.46947156278589086, -0.8829475928589269);
      MXRot(re, im, 68, 0.43837114678907746, -0.898794046299167);
      MXRot(re, im, 69, 0.4067366430758002, -0.9135454576426009);
      MXRot(re, im, 70, 0.37460659341591196, -0.9271838545667874);
      MXRot(re, im, 71, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 73, 0.9975640502598242, -0.0697564737441253);
      MXRot(re, im, 74, 0.9902680687415704, -0.13917310096006544);
      MXRot(re, im, 75, 0.9781476007338057, -0.20791169081775934);
      MXRot(re, im, 76, 0.9612616959383189, -0.27563735581699916);
      MXRot(re, im, 77, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 78, 0.9135454576426009, -0.4067366430758002);
      MXRot(re, im, 79, 0.882947592858927, -0.4694715627858908);
      MXRot(re, im, 80, 0.848048096156426, -0.5299192642332049);
      MXRot(re, im, 81, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 82, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 83, 0.7193398003386512, -0.6946583704589973);
      MXRot(re, im, 84, 0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 85, 0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 86, 0.5591929034707468, -0.8290375725550417);
      MXRot(re, im, 87, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 88, 0.43837114678907746, -0.898794046299167);
      MXRot(re, im, 89, 0.37460659341591196, -0.9271838545667874);
      MXRot(re, im, 90, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 91, 0.24192189559966767, -0.9702957262759965);
      MXRot(re, im, 92, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 93, 0.10452846326765346, -0.9945218953682733);
      MXRot(re, im, 94, 0.03489949670250108, -0.9993908270190958);
      MXRot(re, im, 95, -0.034899496702500955, -0.9993908270190958);
      MXRot(re, im, 96, -0.10452846326765355, -0.9945218953682733);
      MXRot(re, im, 97, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 98, -0.24192189559966779, -0.9702957262759965);
      MXRot(re, im, 99, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 100, -0.37460659341591207, -0.9271838545667874);
      MXRot(re, im, 101, -0.4383711467890775, -0.8987940462991669);
      MXRot(re, im, 102, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 103, -0.5591929034707467, -0.8290375725550417);
      MXRot(re, im, 104, -0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 105, -0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 106, -0.7193398003386512, -0.6946583704589971);
      MXRot(re, im, 107, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 109, 0.9945218953682733, -0.10452846326765347);
      MXRot(re, im, 110, 0.9781476007338057, -0.20791169081775934);
      MXRot(re, im, 111, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 112, 0.9135454576426009, -0.4067366430758002);
      MXRot(re, im, 113, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 114, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 115, 0.7431448254773942, -0.6691306063588582);
      MXRot(re, im, 116, 0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 117, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 118, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 119, 0.4067366430758002, -0.9135454576426009);
      MXRot(re, im, 120, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 121, 0.20791169081775945, -0.9781476007338056);
      MXRot(re, im, 122, 0.10452846326765346, -0.9945218953682733);
      MXRot(re, im, 123, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 124, -0.10452846326765355, -0.9945218953682733);
      MXRot(re, im, 125, -0.20791169081775934, -0.9781476007338057);
      MXRot(re, im, 126, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 127, -0.40673664307580026, -0.9135454576426009);
      MXRot(re, im, 128, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 129, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 130, -0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 131, -0.743144825477394, -0.6691306063588583);
      MXRot(re, im, 132, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 133, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 134, -0.9135454576426008, -0.40673664307580043);
      MXRot(re, im, 135, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 136, -0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 137, -0.9945218953682733, -0.10452846326765373);
      MXRot(re, im, 138, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 139, -0.9945218953682733, 0.1045284632676535);
      MXRot(re, im, 140, -0.9781476007338056, 0.2079116908177595);
      MXRot(re, im, 141, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 142, -0.9135454576426009, 0.4067366430758002);
      MXRot(re, im, 143, -0.8660254037844386, 0.5000000000000001);
      MXRot(re, im, 145, 0.9902680687415704, -0.13917310096006544);
      MXRot(re, im, 146, 0.9612616959383189, -0.27563735581699916);
      MXRot(re, im, 147, 0.9135454576426009, -0.4067366430758002);
      MXRot(re, im, 148, 0.848048096156426, -0.5299192642332049);
      MXRot(re, im, 149, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 150, 0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 151, 0.5591929034707468, -0.8290375725550417);
      MXRot(re, im, 152, 0.43837114678907746, -0.898794046299167);
      MXRot(re, im, 153, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 154, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 155, 0.03489949670250108, -0.9993908270190958);
      MXRot(re, im, 156, -0.10452846326765355, -0.9945218953682733);
      MXRot(re, im, 157, -0.24192189559966779, -0.9702957262759965);
      MXRot(re, im, 158, -0.37460659341591207, -0.9271838545667874);
      MXRot(re, im, 159, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 160, -0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 161, -0.7193398003386512, -0.6946583704589971);
      MXRot(re, im, 162, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 163, -0.882947592858927, -0.4694715627858907);
      MXRot(re, im, 164, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 165, -0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 166, -0.9975640502598242, -0.06975647374412552);
      MXRot(re, im, 167, -0.9975640502598242, 0.06975647374412527);
      MXRot(re, im, 168, -0.9781476007338056, 0.2079116908177595);
      MXRot(re, im, 169, -0.9396926207859084, 0.34202014332566866);
      MXRot(re, im, 170, -0.8829475928589269, 0.46947156278589086);
      MXRot(re, im, 171, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 172, -0.7193398003386511, 0.6946583704589974);
      MXRot(re, im, 173, -0.6156614753256581, 0.7880107536067221);
      MXRot(re, im, 174, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 175, -0.3746065934159123, 0.9271838545667873);
      MXRot(re, im, 176, -0.24192189559966779, 0.9702957262759965);
      MXRot(re, im, 177, -0.10452846326765336, 0.9945218953682734);
      MXRot(re, im, 178, 0.03489949670250128, 0.9993908270190958);
      MXRot(re, im, 179, 0.17364817766692997, 0.9848077530122081);
      MXTr4(re, im, 0, 9, 18, 27);
      MXTr4(re, im, 1, 10, 19, 28);
      MXTr4(re, im, 2, 11, 20, 29);
      MXTr4(re, im, 3, 12, 21, 30);
      MXTr4(re, im, 4, 13, 22, 31);
      MXTr4(re, im, 5, 14, 23, 32);
      MXTr4(re, im, 6, 15, 24, 33);
      MXTr4(re, im, 7, 16, 25, 34);
      MXTr4(re, im, 8, 17, 26, 35);
      MXRot(re, im, 10, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 11, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 12, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 13, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 14, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 15, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 16, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 17, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 19, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 20, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 21, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 22, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 23, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 24, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 25, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 26, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 28, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 29, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 30, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 31, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 32, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 33, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 34, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 35, -0.5000000000000004, 0.8660254037844384);
      MXTr3(re, im, 0, 3, 6);
      MXTr3(re, im, 1, 4, 7);
      MXTr3(re, im, 2, 5, 8);
      MXRot(re, im, 4, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 5, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 7, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 8, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 0, 1, 2);
      MXTr3(re, im, 3, 4, 5);
      MXTr3(re, im, 6, 7, 8);
      MXTr3(re, im, 9, 12, 15);
      MXTr3(re, im, 10, 13, 16);
      MXTr3(re, im, 11, 14, 17);
      MXRot(re, im, 13, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 14, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 16, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 17, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 9, 10, 11);
      MXTr3(re, im, 12, 13, 14);
      MXTr3(re, im, 15, 16, 17);
      MXTr3(re, im, 18, 21, 24);
      MXTr3(re, im, 19, 22, 25);
      MXTr3(re, im, 20, 23, 26);
      MXRot(re, im, 22, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 23, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 25, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 26, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 18, 19, 20);
      MXTr3(re, im, 21, 22, 23);
      MXTr3(re, im, 24, 25, 26);
      MXTr3(re, im, 27, 30, 33);
      MXTr3(re, im, 28, 31, 34);
      MXTr3(re, im, 29, 32, 35);
      MXRot(re, im, 31, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 32, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 34, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 35, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 27, 28, 29);
      MXTr3(re, im, 30, 31, 32);
      MXTr3(re, im, 33, 34, 35);
      MXTr4(re, im, 36, 45, 54, 63);
      MXTr4(re, im, 37, 46, 55, 64);
      MXTr4(re, im, 38, 47, 56, 65);
      MXTr4(re, im, 39, 48, 57, 66);
      MXTr4(re, im, 40, 49, 58, 67);
      MXTr4(re, im, 41, 50, 59, 68);
      MXTr4(re, im, 42, 51, 60, 69);
      MXTr4(re, im, 43, 52, 61, 70);
      MXTr4(re, im, 44, 53, 62, 71);
      MXRot(re, im, 46, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 47, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 48, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 49, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 50, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 51, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 52, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 53, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 55, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 56, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 57, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 58, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 59, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 60, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 61, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 62, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 64, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 65, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 66, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 67, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 68, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 69, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 70, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 71, -0.5000000000000004, 0.8660254037844384);
      MXTr3(re, im, 36, 39, 42);
      MXTr3(re, im, 37, 40, 43);
      MXTr3(re, im, 38, 41, 44);
      MXRot(re, im, 40, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 41, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 43, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 44, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 36, 37, 38);
      MXTr3(re, im, 39, 40, 41);
      MXTr3(re, im, 42, 43, 44);
      MXTr3(re, im, 45, 48, 51);
      MXTr3(re, im, 46, 49, 52);
      MXTr3(re, im, 47, 50, 53);
      MXRot(re, im, 49, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 50, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 52, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 53, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 45, 46, 47);
      MXTr3(re, im, 48, 49, 50);
      MXTr3(re, im, 51, 52, 53);
      MXTr3(re, im, 54, 57, 60);
      MXTr3(re, im, 55, 58, 61);
      MXTr3(re, im, 56, 59, 62);
      MXRot(re, im, 58, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 59, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 61, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 62, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 54, 55, 56);
      MXTr3(re, im, 57, 58, 59);
      MXTr3(re, im, 60, 61, 62);
      MXTr3(re, im, 63, 66, 69);
      MXTr3(re, im, 64, 67, 70);
      MXTr3(re, im, 65, 68, 71);
      MXRot(re, im, 67, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 68, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 70, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 71, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 63, 64, 65);
      MXTr3(re, im, 66, 67, 68);
      MXTr3(re, im, 69, 70, 71);
      MXTr4(re, im, 72, 81, 90, 99);
      MXTr4(re, im, 73, 82, 91, 100);
      MXTr4(re, im, 74, 83, 92, 101);
      MXTr4(re, im, 75, 84, 93, 102);
      MXTr4(re, im, 76, 85, 94, 103);
      MXTr4(re, im, 77, 86, 95, 104);
      MXTr4(re, im, 78, 87, 96, 105);
      MXTr4(re, im, 79, 88, 97, 106);
      MXTr4(re, im, 80, 89, 98, 107);
      MXRot(re, im, 82, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 83, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 84, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 85, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 86, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 87, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 88, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 89, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 91, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 92, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 93, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 94, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 95, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 96, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 97, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 98, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 100, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 101, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 102, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 103, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 104, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 105, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 106, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 107, -0.5000000000000004, 0.8660254037844384);
      MXTr3(re, im, 72, 75, 78);
      MXTr3(re, im, 73, 76, 79);
      MXTr3(re, im, 74, 77, 80);
      MXRot(re, im, 76, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 77, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 79, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 80, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 72, 73, 74);
      MXTr3(re, im, 75, 76, 77);
      MXTr3(re, im, 78, 79, 80);
      MXTr3(re, im, 81, 84, 87);
      MXTr3(re, im, 82, 85, 88);
      MXTr3(re, im, 83, 86, 89);
      MXRot(re, im, 85, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 86, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 88, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 89, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 81, 82, 83);
      MXTr3(re, im, 84, 85, 86);
      MXTr3(re, im, 87, 88, 89);
      MXTr3(re, im, 90, 93, 96);
      MXTr3(re, im, 91, 94, 97);
      MXTr3(re, im, 92, 95, 98);
      MXRot(re, im, 94, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 95, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 97, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 98, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 90, 91, 92);
      MXTr3(re, im, 93, 94, 95);
      MXTr3(re, im, 96, 97, 98);
      MXTr3(re, im, 99, 102, 105);
      MXTr3(re, im, 100, 103, 106);
      MXTr3(re, im, 101, 104, 107);
      MXRot(re, im, 103, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 104, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 106, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 107, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 99, 100, 101);
      MXTr3(re, im, 102, 103, 104);
      MXTr3(re, im, 105, 106, 107);
      MXTr4(re, im, 108, 117, 126, 135);
      MXTr4(re, im, 109, 118, 127, 136);
      MXTr4(re, im, 110, 119, 128, 137);
      MXTr4(re, im, 111, 120, 129, 138);
      MXTr4(re, im, 112, 121, 130, 139);
      MXTr4(re, im, 113, 122, 131, 140);
      MXTr4(re, im, 114, 123, 132, 141);
      MXTr4(re, im, 115, 124, 133, 142);
      MXTr4(re, im, 116, 125, 134, 143);
      MXRot(re, im, 118, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 119, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 120, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 121, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 122, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 123, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 124, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 125, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 127, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 128, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 129, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 130, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 131, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 132, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 133, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 134, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 136, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 137, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 138, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 139, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 140, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 141, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 142, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 143, -0.5000000000000004, 0.8660254037844384);
      MXTr3(re, im, 108, 111, 114);
      MXTr3(re, im, 109, 112, 115);
      MXTr3(re, im, 110, 113, 116);
      MXRot(re, im, 112, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 113, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 115, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 116, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 108, 109, 110);
      MXTr3(re, im, 111, 112, 113);
      MXTr3(re, im, 114, 115, 116);
      MXTr3(re, im, 117, 120, 123);
      MXTr3(re, im, 118, 121, 124);
      MXTr3(re, im, 119, 122, 125);
      MXRot(re, im, 121, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 122, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 124, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 125, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 117, 118, 119);
      MXTr3(re, im, 120, 121, 122);
      MXTr3(re, im, 123, 124, 125);
      MXTr3(re, im, 126, 129, 132);
      MXTr3(re, im, 127, 130, 133);
      MXTr3(re, im, 128, 131, 134);
      MXRot(re, im, 130, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 131, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 133, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 134, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 126, 127, 128);
      MXTr3(re, im, 129, 130, 131);
      MXTr3(re, im, 132, 133, 134);
      MXTr3(re, im, 135, 138, 141);
      MXTr3(re, im, 136, 139, 142);
      MXTr3(re, im, 137, 140, 143);
      MXRot(re, im, 139, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 140, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 142, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 143, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 135, 136, 137);
      MXTr3(re, im, 138, 139, 140);
      MXTr3(re, im, 141, 142, 143);
      MXTr4(re, im, 144, 153, 162, 171);
      MXTr4(re, im, 145, 154, 163, 172);
      MXTr4(re, im, 146, 155, 164, 173);
      MXTr4(re, im, 147, 156, 165, 174);
      MXTr4(re, im, 148, 157, 166, 175);
      MXTr4(re, im, 149, 158, 167, 176);
      MXTr4(re, im, 150, 159, 168, 177);
      MXTr4(re, im, 151, 160, 169, 178);
      MXTr4(re, im, 152, 161, 170, 179);
      MXRot(re, im, 154, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 155, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 156, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 157, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 158, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 159, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 160, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 161, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 163, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 164, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 165, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 166, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 167, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 168, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 169, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 170, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 172, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 173, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 174, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 175, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 176, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 177, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 178, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 179, -0.5000000000000004, 0.8660254037844384);
      MXTr3(re, im, 144, 147, 150);
      MXTr3(re, im, 145, 148, 151);
      MXTr3(re, im, 146, 149, 152);
      MXRot(re, im, 148, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 149, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 151, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 152, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 144, 145, 146);
      MXTr3(re, im, 147, 148, 149);
      MXTr3(re, im, 150, 151, 152);
      MXTr3(re, im, 153, 156, 159);
      MXTr3(re, im, 154, 157, 160);
      MXTr3(re, im, 155, 158, 161);
      MXRot(re, im, 157, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 158, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 160, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 161, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 153, 154, 155);
      MXTr3(re, im, 156, 157, 158);
      MXTr3(re, im, 159, 160, 161);
      MXTr3(re, im, 162, 165, 168);
      MXTr3(re, im, 163, 166, 169);
      MXTr3(re, im, 164, 167, 170);
      MXRot(re, im, 166, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 167, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 169, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 170, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 162, 163, 164);
      MXTr3(re, im, 165, 166, 167);
      MXTr3(re, im, 168, 169, 170);
      MXTr3(re, im, 171, 174, 177);
      MXTr3(re, im, 172, 175, 178);
      MXTr3(re, im, 173, 176, 179);
      MXRot(re, im, 175, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 176, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 178, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 179, -0.9396926207859083, -0.3420201433256689);
      MXTr3(re, im, 171, 172, 173);
      MXTr3(re, im, 174, 175, 176);
      MXTr3(re, im, 177, 178, 179);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
      MXCshft(re, im, CSHFT_INDEXES_4);
      MXCshft(re, im, CSHFT_INDEXES_5);
      MXCshft(re, im, CSHFT_INDEXES_6);
      MXCshft(re, im, CSHFT_INDEXES_7);
    }

    module.exports = {
      "ApplyMixedRadixFFT_180": ApplyMixedRadixFFT_180
    };
  },
  "lc3/math/fft-mx-240": function lc3MathFftMx240(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr3 = Lc3FftMxBaseOp.MXTr3;
    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 48, 162, 98, 181, 53, 174, 218, 188, 161, 50, 30, 27, 111, 76, 93, 169, 206, 68, 165, 14, 216, 92, 121, 55, 42, 102, 100, 4, 192, 125, 19, 228, 167, 110, 28, 159, 238, 191, 77, 141, 58, 186, 65, 21, 51, 78, 189, 209, 212, 128, 163, 146, 70, 33, 171, 74, 225, 23, 147, 118, 184, 197, 137, 139, 235, 47, 114, 220, 11, 72, 129, 211, 80];
    var CSHFT_INDEXES_1 = [2, 96, 85, 13, 168, 158, 190, 29, 207, 116, 88, 157, 142, 106, 64, 201, 56, 90, 25, 15, 36, 87, 109, 208, 164, 194, 221, 59, 234, 227, 119, 232, 131, 79, 237, 143, 154, 226, 71, 81, 49, 210, 32, 123, 151, 82, 97, 133, 175, 38, 183, 149, 214, 224, 203, 152, 130, 31, 75, 45, 18, 180, 5, 12, 120, 7, 108, 160];
    var CSHFT_INDEXES_2 = [3, 144, 202, 104, 196, 89, 205, 20];
    var CSHFT_INDEXES_3 = [6, 60, 9, 204, 200, 8, 156, 94, 217, 140, 10, 24, 195, 41, 54, 222, 107, 112, 124, 199, 233, 179, 230, 35, 39, 231, 83, 145, 22, 99, 229, 215, 44, 198, 185, 17, 132, 127, 115, 40];
    var CSHFT_INDEXES_4 = [16, 84, 193, 173, 170, 26, 63, 153, 178, 182, 101, 52, 126, 67, 117, 136, 91, 73, 177, 134, 223, 155, 46, 66, 69, 213, 176, 86, 61, 57, 138, 187, 113, 172, 122, 103, 148, 166, 62, 105];
    var CSHFT_INDEXES_5 = [34, 219, 236, 95, 37, 135, 43, 150];

    function ApplyMixedRadixFFT_240(re, im) {
      MXTr5(re, im, 0, 48, 96, 144, 192);
      MXTr5(re, im, 1, 49, 97, 145, 193);
      MXTr5(re, im, 2, 50, 98, 146, 194);
      MXTr5(re, im, 3, 51, 99, 147, 195);
      MXTr5(re, im, 4, 52, 100, 148, 196);
      MXTr5(re, im, 5, 53, 101, 149, 197);
      MXTr5(re, im, 6, 54, 102, 150, 198);
      MXTr5(re, im, 7, 55, 103, 151, 199);
      MXTr5(re, im, 8, 56, 104, 152, 200);
      MXTr5(re, im, 9, 57, 105, 153, 201);
      MXTr5(re, im, 10, 58, 106, 154, 202);
      MXTr5(re, im, 11, 59, 107, 155, 203);
      MXTr5(re, im, 12, 60, 108, 156, 204);
      MXTr5(re, im, 13, 61, 109, 157, 205);
      MXTr5(re, im, 14, 62, 110, 158, 206);
      MXTr5(re, im, 15, 63, 111, 159, 207);
      MXTr5(re, im, 16, 64, 112, 160, 208);
      MXTr5(re, im, 17, 65, 113, 161, 209);
      MXTr5(re, im, 18, 66, 114, 162, 210);
      MXTr5(re, im, 19, 67, 115, 163, 211);
      MXTr5(re, im, 20, 68, 116, 164, 212);
      MXTr5(re, im, 21, 69, 117, 165, 213);
      MXTr5(re, im, 22, 70, 118, 166, 214);
      MXTr5(re, im, 23, 71, 119, 167, 215);
      MXTr5(re, im, 24, 72, 120, 168, 216);
      MXTr5(re, im, 25, 73, 121, 169, 217);
      MXTr5(re, im, 26, 74, 122, 170, 218);
      MXTr5(re, im, 27, 75, 123, 171, 219);
      MXTr5(re, im, 28, 76, 124, 172, 220);
      MXTr5(re, im, 29, 77, 125, 173, 221);
      MXTr5(re, im, 30, 78, 126, 174, 222);
      MXTr5(re, im, 31, 79, 127, 175, 223);
      MXTr5(re, im, 32, 80, 128, 176, 224);
      MXTr5(re, im, 33, 81, 129, 177, 225);
      MXTr5(re, im, 34, 82, 130, 178, 226);
      MXTr5(re, im, 35, 83, 131, 179, 227);
      MXTr5(re, im, 36, 84, 132, 180, 228);
      MXTr5(re, im, 37, 85, 133, 181, 229);
      MXTr5(re, im, 38, 86, 134, 182, 230);
      MXTr5(re, im, 39, 87, 135, 183, 231);
      MXTr5(re, im, 40, 88, 136, 184, 232);
      MXTr5(re, im, 41, 89, 137, 185, 233);
      MXTr5(re, im, 42, 90, 138, 186, 234);
      MXTr5(re, im, 43, 91, 139, 187, 235);
      MXTr5(re, im, 44, 92, 140, 188, 236);
      MXTr5(re, im, 45, 93, 141, 189, 237);
      MXTr5(re, im, 46, 94, 142, 190, 238);
      MXTr5(re, im, 47, 95, 143, 191, 239);
      MXRot(re, im, 49, 0.9996573249755573, -0.02617694830787315);
      MXRot(re, im, 50, 0.9986295347545738, -0.05233595624294383);
      MXRot(re, im, 51, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 52, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 53, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 54, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 55, 0.9832549075639546, -0.18223552549214744);
      MXRot(re, im, 56, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 57, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 58, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 59, 0.958819734868193, -0.2840153447039226);
      MXRot(re, im, 60, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 61, 0.9426414910921784, -0.3338068592337709);
      MXRot(re, im, 62, 0.9335804264972017, -0.3583679495453002);
      MXRot(re, im, 63, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 64, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 65, 0.9025852843498606, -0.4305110968082951);
      MXRot(re, im, 66, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 67, 0.8788171126619654, -0.4771587602596084);
      MXRot(re, im, 68, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 69, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 70, 0.838670567945424, -0.544639035015027);
      MXRot(re, im, 71, 0.8241261886220157, -0.5664062369248328);
      MXRot(re, im, 72, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 73, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 74, 0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 75, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 76, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 77, 0.7253743710122876, -0.6883545756937539);
      MXRot(re, im, 78, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 79, 0.688354575693754, -0.7253743710122875);
      MXRot(re, im, 80, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 81, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 82, 0.6293203910498375, -0.7771459614569708);
      MXRot(re, im, 83, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 84, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 85, 0.5664062369248329, -0.8241261886220156);
      MXRot(re, im, 86, 0.5446390350150272, -0.8386705679454239);
      MXRot(re, im, 87, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 88, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 89, 0.47715876025960857, -0.8788171126619653);
      MXRot(re, im, 90, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 91, 0.43051109680829525, -0.9025852843498605);
      MXRot(re, im, 92, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 93, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 94, 0.3583679495453004, -0.9335804264972017);
      MXRot(re, im, 95, 0.3338068592337711, -0.9426414910921783);
      MXRot(re, im, 97, 0.9986295347545738, -0.05233595624294383);
      MXRot(re, im, 98, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 99, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 100, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 101, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 102, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 103, 0.9335804264972017, -0.3583679495453002);
      MXRot(re, im, 104, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 105, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 106, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 107, 0.838670567945424, -0.544639035015027);
      MXRot(re, im, 108, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 109, 0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 110, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 111, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 112, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 113, 0.6293203910498375, -0.7771459614569708);
      MXRot(re, im, 114, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 115, 0.5446390350150272, -0.8386705679454239);
      MXRot(re, im, 116, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 117, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 118, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 119, 0.3583679495453004, -0.9335804264972017);
      MXRot(re, im, 120, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 121, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 122, 0.20791169081775945, -0.9781476007338056);
      MXRot(re, im, 123, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 124, 0.10452846326765368, -0.9945218953682733);
      MXRot(re, im, 125, 0.052335956242943966, -0.9986295347545738);
      MXRot(re, im, 126, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 127, -0.05233595624294362, -0.9986295347545738);
      MXRot(re, im, 128, -0.10452846326765333, -0.9945218953682734);
      MXRot(re, im, 129, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 130, -0.20791169081775912, -0.9781476007338057);
      MXRot(re, im, 131, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 132, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 133, -0.35836794954530005, -0.9335804264972019);
      MXRot(re, im, 134, -0.40673664307580004, -0.913545457642601);
      MXRot(re, im, 135, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 136, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 137, -0.5446390350150268, -0.8386705679454243);
      MXRot(re, im, 138, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 139, -0.6293203910498373, -0.777145961456971);
      MXRot(re, im, 140, -0.6691306063588579, -0.7431448254773945);
      MXRot(re, im, 141, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 142, -0.743144825477394, -0.6691306063588583);
      MXRot(re, im, 143, -0.7771459614569707, -0.6293203910498377);
      MXRot(re, im, 145, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 146, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 147, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 148, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 149, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 150, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 151, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 152, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 153, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 154, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 155, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 156, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 157, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 158, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 159, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 160, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 161, 0.23344536385590547, -0.9723699203976766);
      MXRot(re, im, 162, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 163, 0.078459095727845, -0.996917333733128);
      MXRot(re, im, 164, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 165, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 166, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 167, -0.23344536385590534, -0.9723699203976767);
      MXRot(re, im, 168, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 169, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 170, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 171, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 172, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 173, -0.6494480483301835, -0.760405965600031);
      MXRot(re, im, 174, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 175, -0.7604059656000309, -0.6494480483301838);
      MXRot(re, im, 176, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 177, -0.8526401643540922, -0.5224985647159489);
      MXRot(re, im, 178, -0.8910065241883678, -0.45399049973954686);
      MXRot(re, im, 179, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 180, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 181, -0.9723699203976766, -0.23344536385590553);
      MXRot(re, im, 182, -0.9876883405951377, -0.15643446504023098);
      MXRot(re, im, 183, -0.996917333733128, -0.07845909572784507);
      MXRot(re, im, 184, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 185, -0.996917333733128, 0.07845909572784482);
      MXRot(re, im, 186, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 187, -0.9723699203976767, 0.23344536385590528);
      MXRot(re, im, 188, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 189, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 190, -0.8910065241883679, 0.4539904997395467);
      MXRot(re, im, 191, -0.8526401643540923, 0.5224985647159487);
      MXRot(re, im, 193, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 194, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 195, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 196, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 197, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 198, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 199, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 200, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 201, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 202, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 203, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 204, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 205, 0.20791169081775945, -0.9781476007338056);
      MXRot(re, im, 206, 0.10452846326765368, -0.9945218953682733);
      MXRot(re, im, 207, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 208, -0.10452846326765333, -0.9945218953682734);
      MXRot(re, im, 209, -0.20791169081775912, -0.9781476007338057);
      MXRot(re, im, 210, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 211, -0.40673664307580004, -0.913545457642601);
      MXRot(re, im, 212, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 213, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 214, -0.6691306063588579, -0.7431448254773945);
      MXRot(re, im, 215, -0.743144825477394, -0.6691306063588583);
      MXRot(re, im, 216, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 217, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 218, -0.9135454576426008, -0.40673664307580043);
      MXRot(re, im, 219, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 220, -0.9781476007338056, -0.20791169081775973);
      MXRot(re, im, 221, -0.9945218953682733, -0.10452846326765373);
      MXRot(re, im, 222, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 223, -0.9945218953682734, 0.10452846326765305);
      MXRot(re, im, 224, -0.9781476007338057, 0.20791169081775907);
      MXRot(re, im, 225, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 226, -0.9135454576426011, 0.4067366430757998);
      MXRot(re, im, 227, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 228, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 229, -0.7431448254773946, 0.6691306063588579);
      MXRot(re, im, 230, -0.6691306063588585, 0.743144825477394);
      MXRot(re, im, 231, -0.5877852522924732, 0.8090169943749473);
      MXRot(re, im, 232, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 233, -0.4067366430758009, 0.9135454576426005);
      MXRot(re, im, 234, -0.30901699437494756, 0.9510565162951535);
      MXRot(re, im, 235, -0.2079116908177598, 0.9781476007338056);
      MXRot(re, im, 236, -0.10452846326765423, 0.9945218953682733);
      MXRot(re, im, 237, -1.8369701987210297e-16, 1.0);
      MXRot(re, im, 238, 0.10452846326765299, 0.9945218953682734);
      MXRot(re, im, 239, 0.20791169081775857, 0.9781476007338058);
      MXTr4(re, im, 0, 12, 24, 36);
      MXTr4(re, im, 1, 13, 25, 37);
      MXTr4(re, im, 2, 14, 26, 38);
      MXTr4(re, im, 3, 15, 27, 39);
      MXTr4(re, im, 4, 16, 28, 40);
      MXTr4(re, im, 5, 17, 29, 41);
      MXTr4(re, im, 6, 18, 30, 42);
      MXTr4(re, im, 7, 19, 31, 43);
      MXTr4(re, im, 8, 20, 32, 44);
      MXTr4(re, im, 9, 21, 33, 45);
      MXTr4(re, im, 10, 22, 34, 46);
      MXTr4(re, im, 11, 23, 35, 47);
      MXRot(re, im, 13, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 14, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 15, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 16, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 17, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 18, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 19, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 20, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 21, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 22, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 23, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 25, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 26, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 27, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 28, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 29, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 30, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 31, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 32, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 33, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 34, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 35, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 37, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 38, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 39, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 40, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 41, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 42, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 43, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 44, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 45, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 46, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 47, -0.38268343236509034, 0.9238795325112865);
      MXTr4(re, im, 0, 3, 6, 9);
      MXTr4(re, im, 1, 4, 7, 10);
      MXTr4(re, im, 2, 5, 8, 11);
      MXRot(re, im, 4, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 5, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 7, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 8, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 10, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 11, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 0, 1, 2);
      MXTr3(re, im, 3, 4, 5);
      MXTr3(re, im, 6, 7, 8);
      MXTr3(re, im, 9, 10, 11);
      MXTr4(re, im, 12, 15, 18, 21);
      MXTr4(re, im, 13, 16, 19, 22);
      MXTr4(re, im, 14, 17, 20, 23);
      MXRot(re, im, 16, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 17, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 19, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 20, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 22, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 23, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 12, 13, 14);
      MXTr3(re, im, 15, 16, 17);
      MXTr3(re, im, 18, 19, 20);
      MXTr3(re, im, 21, 22, 23);
      MXTr4(re, im, 24, 27, 30, 33);
      MXTr4(re, im, 25, 28, 31, 34);
      MXTr4(re, im, 26, 29, 32, 35);
      MXRot(re, im, 28, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 29, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 31, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 32, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 34, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 35, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 24, 25, 26);
      MXTr3(re, im, 27, 28, 29);
      MXTr3(re, im, 30, 31, 32);
      MXTr3(re, im, 33, 34, 35);
      MXTr4(re, im, 36, 39, 42, 45);
      MXTr4(re, im, 37, 40, 43, 46);
      MXTr4(re, im, 38, 41, 44, 47);
      MXRot(re, im, 40, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 41, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 43, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 44, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 46, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 47, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 36, 37, 38);
      MXTr3(re, im, 39, 40, 41);
      MXTr3(re, im, 42, 43, 44);
      MXTr3(re, im, 45, 46, 47);
      MXTr4(re, im, 48, 60, 72, 84);
      MXTr4(re, im, 49, 61, 73, 85);
      MXTr4(re, im, 50, 62, 74, 86);
      MXTr4(re, im, 51, 63, 75, 87);
      MXTr4(re, im, 52, 64, 76, 88);
      MXTr4(re, im, 53, 65, 77, 89);
      MXTr4(re, im, 54, 66, 78, 90);
      MXTr4(re, im, 55, 67, 79, 91);
      MXTr4(re, im, 56, 68, 80, 92);
      MXTr4(re, im, 57, 69, 81, 93);
      MXTr4(re, im, 58, 70, 82, 94);
      MXTr4(re, im, 59, 71, 83, 95);
      MXRot(re, im, 61, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 62, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 63, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 64, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 65, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 66, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 67, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 68, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 69, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 70, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 71, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 73, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 74, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 75, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 76, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 77, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 78, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 79, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 80, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 81, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 82, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 83, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 85, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 86, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 87, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 88, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 89, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 90, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 91, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 92, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 93, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 94, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 95, -0.38268343236509034, 0.9238795325112865);
      MXTr4(re, im, 48, 51, 54, 57);
      MXTr4(re, im, 49, 52, 55, 58);
      MXTr4(re, im, 50, 53, 56, 59);
      MXRot(re, im, 52, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 53, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 55, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 56, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 58, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 59, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 48, 49, 50);
      MXTr3(re, im, 51, 52, 53);
      MXTr3(re, im, 54, 55, 56);
      MXTr3(re, im, 57, 58, 59);
      MXTr4(re, im, 60, 63, 66, 69);
      MXTr4(re, im, 61, 64, 67, 70);
      MXTr4(re, im, 62, 65, 68, 71);
      MXRot(re, im, 64, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 65, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 67, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 68, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 70, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 71, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 60, 61, 62);
      MXTr3(re, im, 63, 64, 65);
      MXTr3(re, im, 66, 67, 68);
      MXTr3(re, im, 69, 70, 71);
      MXTr4(re, im, 72, 75, 78, 81);
      MXTr4(re, im, 73, 76, 79, 82);
      MXTr4(re, im, 74, 77, 80, 83);
      MXRot(re, im, 76, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 77, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 79, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 80, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 82, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 83, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 72, 73, 74);
      MXTr3(re, im, 75, 76, 77);
      MXTr3(re, im, 78, 79, 80);
      MXTr3(re, im, 81, 82, 83);
      MXTr4(re, im, 84, 87, 90, 93);
      MXTr4(re, im, 85, 88, 91, 94);
      MXTr4(re, im, 86, 89, 92, 95);
      MXRot(re, im, 88, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 89, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 91, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 92, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 94, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 95, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 84, 85, 86);
      MXTr3(re, im, 87, 88, 89);
      MXTr3(re, im, 90, 91, 92);
      MXTr3(re, im, 93, 94, 95);
      MXTr4(re, im, 96, 108, 120, 132);
      MXTr4(re, im, 97, 109, 121, 133);
      MXTr4(re, im, 98, 110, 122, 134);
      MXTr4(re, im, 99, 111, 123, 135);
      MXTr4(re, im, 100, 112, 124, 136);
      MXTr4(re, im, 101, 113, 125, 137);
      MXTr4(re, im, 102, 114, 126, 138);
      MXTr4(re, im, 103, 115, 127, 139);
      MXTr4(re, im, 104, 116, 128, 140);
      MXTr4(re, im, 105, 117, 129, 141);
      MXTr4(re, im, 106, 118, 130, 142);
      MXTr4(re, im, 107, 119, 131, 143);
      MXRot(re, im, 109, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 110, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 111, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 112, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 113, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 114, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 115, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 116, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 117, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 118, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 119, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 121, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 122, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 123, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 124, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 125, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 126, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 127, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 128, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 129, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 130, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 131, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 133, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 134, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 135, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 136, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 137, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 138, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 139, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 140, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 141, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 142, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 143, -0.38268343236509034, 0.9238795325112865);
      MXTr4(re, im, 96, 99, 102, 105);
      MXTr4(re, im, 97, 100, 103, 106);
      MXTr4(re, im, 98, 101, 104, 107);
      MXRot(re, im, 100, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 101, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 103, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 104, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 106, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 107, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 96, 97, 98);
      MXTr3(re, im, 99, 100, 101);
      MXTr3(re, im, 102, 103, 104);
      MXTr3(re, im, 105, 106, 107);
      MXTr4(re, im, 108, 111, 114, 117);
      MXTr4(re, im, 109, 112, 115, 118);
      MXTr4(re, im, 110, 113, 116, 119);
      MXRot(re, im, 112, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 113, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 115, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 116, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 118, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 119, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 108, 109, 110);
      MXTr3(re, im, 111, 112, 113);
      MXTr3(re, im, 114, 115, 116);
      MXTr3(re, im, 117, 118, 119);
      MXTr4(re, im, 120, 123, 126, 129);
      MXTr4(re, im, 121, 124, 127, 130);
      MXTr4(re, im, 122, 125, 128, 131);
      MXRot(re, im, 124, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 125, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 127, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 128, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 130, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 131, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 120, 121, 122);
      MXTr3(re, im, 123, 124, 125);
      MXTr3(re, im, 126, 127, 128);
      MXTr3(re, im, 129, 130, 131);
      MXTr4(re, im, 132, 135, 138, 141);
      MXTr4(re, im, 133, 136, 139, 142);
      MXTr4(re, im, 134, 137, 140, 143);
      MXRot(re, im, 136, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 137, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 139, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 140, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 142, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 143, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 132, 133, 134);
      MXTr3(re, im, 135, 136, 137);
      MXTr3(re, im, 138, 139, 140);
      MXTr3(re, im, 141, 142, 143);
      MXTr4(re, im, 144, 156, 168, 180);
      MXTr4(re, im, 145, 157, 169, 181);
      MXTr4(re, im, 146, 158, 170, 182);
      MXTr4(re, im, 147, 159, 171, 183);
      MXTr4(re, im, 148, 160, 172, 184);
      MXTr4(re, im, 149, 161, 173, 185);
      MXTr4(re, im, 150, 162, 174, 186);
      MXTr4(re, im, 151, 163, 175, 187);
      MXTr4(re, im, 152, 164, 176, 188);
      MXTr4(re, im, 153, 165, 177, 189);
      MXTr4(re, im, 154, 166, 178, 190);
      MXTr4(re, im, 155, 167, 179, 191);
      MXRot(re, im, 157, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 158, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 159, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 160, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 161, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 162, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 163, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 164, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 165, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 166, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 167, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 169, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 170, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 171, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 172, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 173, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 174, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 175, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 176, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 177, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 178, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 179, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 181, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 182, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 183, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 184, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 185, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 186, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 187, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 188, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 189, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 190, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 191, -0.38268343236509034, 0.9238795325112865);
      MXTr4(re, im, 144, 147, 150, 153);
      MXTr4(re, im, 145, 148, 151, 154);
      MXTr4(re, im, 146, 149, 152, 155);
      MXRot(re, im, 148, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 149, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 151, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 152, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 154, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 155, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 144, 145, 146);
      MXTr3(re, im, 147, 148, 149);
      MXTr3(re, im, 150, 151, 152);
      MXTr3(re, im, 153, 154, 155);
      MXTr4(re, im, 156, 159, 162, 165);
      MXTr4(re, im, 157, 160, 163, 166);
      MXTr4(re, im, 158, 161, 164, 167);
      MXRot(re, im, 160, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 161, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 163, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 164, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 166, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 167, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 156, 157, 158);
      MXTr3(re, im, 159, 160, 161);
      MXTr3(re, im, 162, 163, 164);
      MXTr3(re, im, 165, 166, 167);
      MXTr4(re, im, 168, 171, 174, 177);
      MXTr4(re, im, 169, 172, 175, 178);
      MXTr4(re, im, 170, 173, 176, 179);
      MXRot(re, im, 172, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 173, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 175, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 176, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 178, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 179, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 168, 169, 170);
      MXTr3(re, im, 171, 172, 173);
      MXTr3(re, im, 174, 175, 176);
      MXTr3(re, im, 177, 178, 179);
      MXTr4(re, im, 180, 183, 186, 189);
      MXTr4(re, im, 181, 184, 187, 190);
      MXTr4(re, im, 182, 185, 188, 191);
      MXRot(re, im, 184, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 185, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 187, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 188, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 190, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 191, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 180, 181, 182);
      MXTr3(re, im, 183, 184, 185);
      MXTr3(re, im, 186, 187, 188);
      MXTr3(re, im, 189, 190, 191);
      MXTr4(re, im, 192, 204, 216, 228);
      MXTr4(re, im, 193, 205, 217, 229);
      MXTr4(re, im, 194, 206, 218, 230);
      MXTr4(re, im, 195, 207, 219, 231);
      MXTr4(re, im, 196, 208, 220, 232);
      MXTr4(re, im, 197, 209, 221, 233);
      MXTr4(re, im, 198, 210, 222, 234);
      MXTr4(re, im, 199, 211, 223, 235);
      MXTr4(re, im, 200, 212, 224, 236);
      MXTr4(re, im, 201, 213, 225, 237);
      MXTr4(re, im, 202, 214, 226, 238);
      MXTr4(re, im, 203, 215, 227, 239);
      MXRot(re, im, 205, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 206, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 207, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 208, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 209, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 210, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 211, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 212, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 213, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 214, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 215, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 217, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 218, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 219, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 220, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 221, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 222, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 223, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 224, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 225, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 226, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 227, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 229, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 230, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 231, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 232, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 233, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 234, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 235, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 236, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 237, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 238, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 239, -0.38268343236509034, 0.9238795325112865);
      MXTr4(re, im, 192, 195, 198, 201);
      MXTr4(re, im, 193, 196, 199, 202);
      MXTr4(re, im, 194, 197, 200, 203);
      MXRot(re, im, 196, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 197, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 199, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 200, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 202, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 203, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 192, 193, 194);
      MXTr3(re, im, 195, 196, 197);
      MXTr3(re, im, 198, 199, 200);
      MXTr3(re, im, 201, 202, 203);
      MXTr4(re, im, 204, 207, 210, 213);
      MXTr4(re, im, 205, 208, 211, 214);
      MXTr4(re, im, 206, 209, 212, 215);
      MXRot(re, im, 208, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 209, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 211, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 212, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 214, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 215, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 204, 205, 206);
      MXTr3(re, im, 207, 208, 209);
      MXTr3(re, im, 210, 211, 212);
      MXTr3(re, im, 213, 214, 215);
      MXTr4(re, im, 216, 219, 222, 225);
      MXTr4(re, im, 217, 220, 223, 226);
      MXTr4(re, im, 218, 221, 224, 227);
      MXRot(re, im, 220, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 221, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 223, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 224, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 226, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 227, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 216, 217, 218);
      MXTr3(re, im, 219, 220, 221);
      MXTr3(re, im, 222, 223, 224);
      MXTr3(re, im, 225, 226, 227);
      MXTr4(re, im, 228, 231, 234, 237);
      MXTr4(re, im, 229, 232, 235, 238);
      MXTr4(re, im, 230, 233, 236, 239);
      MXRot(re, im, 232, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 233, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 235, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 236, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 238, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 239, -1.0, -1.2246467991473532e-16);
      MXTr3(re, im, 228, 229, 230);
      MXTr3(re, im, 231, 232, 233);
      MXTr3(re, im, 234, 235, 236);
      MXTr3(re, im, 237, 238, 239);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
      MXCshft(re, im, CSHFT_INDEXES_4);
      MXCshft(re, im, CSHFT_INDEXES_5);
    }

    module.exports = {
      "ApplyMixedRadixFFT_240": ApplyMixedRadixFFT_240
    };
  },
  "lc3/math/fft-mx-320": function lc3MathFftMx320(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 64, 268, 215, 58, 248, 211, 106, 85, 17, 176, 114, 293, 235, 62, 140, 13, 224, 270, 39, 308, 223, 206, 90, 33, 228, 222, 142, 141, 77, 188, 214, 298, 251, 99, 305, 31, 100, 5, 16, 112, 165, 18, 240, 3, 192, 166, 82, 129, 281, 75, 60, 12, 160, 2, 128, 217, 186, 86, 81, 65, 28, 212, 170, 34, 292, 171, 98, 241, 67, 156, 125, 25, 20, 4, 256, 115, 53, 232, 174, 290, 43, 200, 10, 32, 164, 258, 243, 195, 54, 296, 123, 201, 74, 300, 15, 48, 216, 122, 137, 185, 22, 132, 169, 274, 295, 59, 312, 175, 50, 40, 8, 208, 218, 250, 35, 52, 168, 210, 42, 136, 121, 73, 236, 126, 89, 273, 231, 110, 37, 180, 6, 80];
    var CSHFT_INDEXES_1 = [7, 144, 269, 279, 311, 111, 101, 69, 284, 267, 151, 109, 277, 183, 198, 246, 83, 193, 230, 46, 88, 209, 282, 139, 313, 239, 318, 255, 51, 104, 261, 71, 108, 213, 234, 302, 143, 205, 26, 84, 257, 179, 306, 95, 49, 280, 11, 96, 113, 229, 286, 91, 97, 177, 178, 242, 131, 105, 21, 68, 220, 14, 288, 219, 314, 303, 207, 154, 301, 79, 316, 127, 153, 237, 190, 38, 244, 259, 307, 159, 317, 191, 102, 133, 233, 238, 254, 291, 107, 149, 285, 27, 148, 221, 78, 252, 163, 194, 294, 299, 315, 63, 204, 266, 87, 145, 29, 276, 119, 309, 287, 155, 61, 76, 124, 265, 23, 196, 118, 245, 19, 304, 271, 103, 197, 182, 134, 297, 187, 150, 45, 24, 260];
    var CSHFT_INDEXES_2 = [9, 272, 167, 146, 93, 225, 30, 36, 116, 117, 181, 70, 44, 264, 263, 199, 310, 47, 152, 173, 226, 94, 289, 283, 203, 202, 138, 249, 275, 55, 56, 120];
    var CSHFT_INDEXES_3 = [41, 72, 172, 162, 130];
    var CSHFT_INDEXES_4 = [57, 184, 262, 135];
    var CSHFT_INDEXES_5 = [66, 92, 161];
    var CSHFT_INDEXES_6 = [147, 157, 189, 278, 247];
    var CSHFT_INDEXES_7 = [158, 253, 227];

    function ApplyMixedRadixFFT_320_Part1(re, im) {
      MXTr5(re, im, 0, 64, 128, 192, 256);
      MXTr5(re, im, 1, 65, 129, 193, 257);
      MXTr5(re, im, 2, 66, 130, 194, 258);
      MXTr5(re, im, 3, 67, 131, 195, 259);
      MXTr5(re, im, 4, 68, 132, 196, 260);
      MXTr5(re, im, 5, 69, 133, 197, 261);
      MXTr5(re, im, 6, 70, 134, 198, 262);
      MXTr5(re, im, 7, 71, 135, 199, 263);
      MXTr5(re, im, 8, 72, 136, 200, 264);
      MXTr5(re, im, 9, 73, 137, 201, 265);
      MXTr5(re, im, 10, 74, 138, 202, 266);
      MXTr5(re, im, 11, 75, 139, 203, 267);
      MXTr5(re, im, 12, 76, 140, 204, 268);
      MXTr5(re, im, 13, 77, 141, 205, 269);
      MXTr5(re, im, 14, 78, 142, 206, 270);
      MXTr5(re, im, 15, 79, 143, 207, 271);
      MXTr5(re, im, 16, 80, 144, 208, 272);
      MXTr5(re, im, 17, 81, 145, 209, 273);
      MXTr5(re, im, 18, 82, 146, 210, 274);
      MXTr5(re, im, 19, 83, 147, 211, 275);
      MXTr5(re, im, 20, 84, 148, 212, 276);
      MXTr5(re, im, 21, 85, 149, 213, 277);
      MXTr5(re, im, 22, 86, 150, 214, 278);
      MXTr5(re, im, 23, 87, 151, 215, 279);
      MXTr5(re, im, 24, 88, 152, 216, 280);
      MXTr5(re, im, 25, 89, 153, 217, 281);
      MXTr5(re, im, 26, 90, 154, 218, 282);
      MXTr5(re, im, 27, 91, 155, 219, 283);
      MXTr5(re, im, 28, 92, 156, 220, 284);
      MXTr5(re, im, 29, 93, 157, 221, 285);
      MXTr5(re, im, 30, 94, 158, 222, 286);
      MXTr5(re, im, 31, 95, 159, 223, 287);
      MXTr5(re, im, 32, 96, 160, 224, 288);
      MXTr5(re, im, 33, 97, 161, 225, 289);
      MXTr5(re, im, 34, 98, 162, 226, 290);
      MXTr5(re, im, 35, 99, 163, 227, 291);
      MXTr5(re, im, 36, 100, 164, 228, 292);
      MXTr5(re, im, 37, 101, 165, 229, 293);
      MXTr5(re, im, 38, 102, 166, 230, 294);
      MXTr5(re, im, 39, 103, 167, 231, 295);
      MXTr5(re, im, 40, 104, 168, 232, 296);
      MXTr5(re, im, 41, 105, 169, 233, 297);
      MXTr5(re, im, 42, 106, 170, 234, 298);
      MXTr5(re, im, 43, 107, 171, 235, 299);
      MXTr5(re, im, 44, 108, 172, 236, 300);
      MXTr5(re, im, 45, 109, 173, 237, 301);
      MXTr5(re, im, 46, 110, 174, 238, 302);
      MXTr5(re, im, 47, 111, 175, 239, 303);
      MXTr5(re, im, 48, 112, 176, 240, 304);
      MXTr5(re, im, 49, 113, 177, 241, 305);
      MXTr5(re, im, 50, 114, 178, 242, 306);
      MXTr5(re, im, 51, 115, 179, 243, 307);
      MXTr5(re, im, 52, 116, 180, 244, 308);
      MXTr5(re, im, 53, 117, 181, 245, 309);
      MXTr5(re, im, 54, 118, 182, 246, 310);
      MXTr5(re, im, 55, 119, 183, 247, 311);
      MXTr5(re, im, 56, 120, 184, 248, 312);
      MXTr5(re, im, 57, 121, 185, 249, 313);
      MXTr5(re, im, 58, 122, 186, 250, 314);
      MXTr5(re, im, 59, 123, 187, 251, 315);
      MXTr5(re, im, 60, 124, 188, 252, 316);
      MXTr5(re, im, 61, 125, 189, 253, 317);
      MXTr5(re, im, 62, 126, 190, 254, 318);
      MXTr5(re, im, 63, 127, 191, 255, 319);
      MXRot(re, im, 65, 0.9998072404820648, -0.0196336924606283);
      MXRot(re, im, 66, 0.9992290362407229, -0.03925981575906861);
      MXRot(re, im, 67, 0.9982656101847159, -0.05887080365118903);
      MXRot(re, im, 68, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 69, 0.9951847266721969, -0.0980171403295606);
      MXRot(re, im, 70, 0.9930684569549263, -0.11753739745783764);
      MXRot(re, im, 71, 0.9905693404435773, -0.13701234168196802);
      MXRot(re, im, 72, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 73, 0.9844265680898916, -0.1757962799343545);
      MXRot(re, im, 74, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 75, 0.9767658813208724, -0.21430915306505074);
      MXRot(re, im, 76, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 77, 0.9675990923602598, -0.25249157701515795);
      MXRot(re, im, 78, 0.9624552364536473, -0.27144044986507426);
      MXRot(re, im, 79, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 80, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 81, 0.944806046466878, -0.3276301795616935);
      MXRot(re, im, 82, 0.9381913359224842, -0.34611705707749296);
      MXRot(re, im, 83, 0.9312149347588036, -0.36447049987914965);
      MXRot(re, im, 84, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 85, 0.916187957117136, -0.40074883310314097);
      MXRot(re, im, 86, 0.9081431738250813, -0.4186597375374281);
      MXRot(re, im, 87, 0.8997482840522215, -0.4364092406733421);
      MXRot(re, im, 88, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 89, 0.881921264348355, -0.47139673682599764);
      MXRot(re, im, 90, 0.8724960070727972, -0.4886212414969549);
      MXRot(re, im, 91, 0.8627343859777918, -0.5056573733779846);
      MXRot(re, im, 92, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 93, 0.8422172337162865, -0.5391383229110002);
      MXRot(re, im, 94, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 95, 0.8204014435255136, -0.5717879602276122);
      MXRot(re, im, 96, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 97, 0.7973206537727071, -0.6035559419535714);
      MXRot(re, im, 98, 0.785316930880745, -0.619093949309834);
      MXRot(re, im, 99, 0.773010453362737, -0.6343932841636455);
      MXRot(re, im, 100, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 101, 0.7475083268625968, -0.6642524379112817);
      MXRot(re, im, 102, 0.7343225094356856, -0.6788007455329417);
      MXRot(re, im, 103, 0.7208535967029188, -0.6930873625456359);
      MXRot(re, im, 104, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 105, 0.6930873625456359, -0.7208535967029188);
      MXRot(re, im, 106, 0.6788007455329418, -0.7343225094356856);
      MXRot(re, im, 107, 0.6642524379112817, -0.7475083268625967);
      MXRot(re, im, 108, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 109, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 110, 0.619093949309834, -0.785316930880745);
      MXRot(re, im, 111, 0.6035559419535714, -0.7973206537727071);
      MXRot(re, im, 112, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 113, 0.5717879602276122, -0.8204014435255136);
      MXRot(re, im, 114, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 115, 0.5391383229110004, -0.8422172337162864);
      MXRot(re, im, 116, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 117, 0.5056573733779846, -0.8627343859777918);
      MXRot(re, im, 118, 0.48862124149695496, -0.8724960070727971);
      MXRot(re, im, 119, 0.4713967368259978, -0.8819212643483549);
      MXRot(re, im, 120, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 121, 0.436409240673342, -0.8997482840522215);
      MXRot(re, im, 122, 0.41865973753742813, -0.9081431738250813);
      MXRot(re, im, 123, 0.4007488331031411, -0.9161879571171359);
      MXRot(re, im, 124, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 125, 0.3644704998791496, -0.9312149347588036);
      MXRot(re, im, 126, 0.346117057077493, -0.9381913359224842);
      MXRot(re, im, 127, 0.32763017956169366, -0.9448060464668779);
      MXRot(re, im, 129, 0.9992290362407229, -0.03925981575906861);
      MXRot(re, im, 130, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 131, 0.9930684569549263, -0.11753739745783764);
      MXRot(re, im, 132, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 133, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 134, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 135, 0.9624552364536473, -0.27144044986507426);
      MXRot(re, im, 136, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 137, 0.9381913359224842, -0.34611705707749296);
      MXRot(re, im, 138, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 139, 0.9081431738250813, -0.4186597375374281);
      MXRot(re, im, 140, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 141, 0.8724960070727972, -0.4886212414969549);
      MXRot(re, im, 142, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 143, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 144, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 145, 0.785316930880745, -0.619093949309834);
      MXRot(re, im, 146, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 147, 0.7343225094356856, -0.6788007455329417);
      MXRot(re, im, 148, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 149, 0.6788007455329418, -0.7343225094356856);
      MXRot(re, im, 150, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 151, 0.619093949309834, -0.785316930880745);
      MXRot(re, im, 152, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 153, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 154, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 155, 0.48862124149695496, -0.8724960070727971);
      MXRot(re, im, 156, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 157, 0.41865973753742813, -0.9081431738250813);
      MXRot(re, im, 158, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 159, 0.346117057077493, -0.9381913359224842);
      MXRot(re, im, 160, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 161, 0.2714404498650743, -0.9624552364536473);
      MXRot(re, im, 162, 0.23344536385590547, -0.9723699203976766);
      MXRot(re, im, 163, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 164, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 165, 0.1175373974578377, -0.9930684569549263);
      MXRot(re, im, 166, 0.078459095727845, -0.996917333733128);
      MXRot(re, im, 167, 0.039259815759068666, -0.9992290362407229);
      MXRot(re, im, 168, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 169, -0.03925981575906855, -0.9992290362407229);
      MXRot(re, im, 170, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 171, -0.11753739745783758, -0.9930684569549263);
      MXRot(re, im, 172, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 173, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 174, -0.23344536385590534, -0.9723699203976767);
      MXRot(re, im, 175, -0.2714404498650742, -0.9624552364536473);
      MXRot(re, im, 176, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 177, -0.3461170570774929, -0.9381913359224842);
      MXRot(re, im, 178, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 179, -0.4186597375374278, -0.9081431738250815);
      MXRot(re, im, 180, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 181, -0.48862124149695507, -0.8724960070727971);
      MXRot(re, im, 182, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 183, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 184, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 185, -0.6190939493098341, -0.7853169308807448);
      MXRot(re, im, 186, -0.6494480483301835, -0.760405965600031);
      MXRot(re, im, 187, -0.6788007455329416, -0.7343225094356858);
      MXRot(re, im, 188, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 189, -0.7343225094356857, -0.6788007455329417);
      MXRot(re, im, 190, -0.7604059656000309, -0.6494480483301838);
      MXRot(re, im, 191, -0.7853169308807447, -0.6190939493098342);
      MXRot(re, im, 193, 0.9982656101847159, -0.05887080365118903);
      MXRot(re, im, 194, 0.9930684569549263, -0.11753739745783764);
      MXRot(re, im, 195, 0.9844265680898916, -0.1757962799343545);
      MXRot(re, im, 196, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 197, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 198, 0.9381913359224842, -0.34611705707749296);
      MXRot(re, im, 199, 0.916187957117136, -0.40074883310314097);
      MXRot(re, im, 200, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 201, 0.8627343859777918, -0.5056573733779846);
      MXRot(re, im, 202, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 203, 0.7973206537727071, -0.6035559419535714);
      MXRot(re, im, 204, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 205, 0.7208535967029188, -0.6930873625456359);
      MXRot(re, im, 206, 0.6788007455329418, -0.7343225094356856);
      MXRot(re, im, 207, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 208, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 209, 0.5391383229110004, -0.8422172337162864);
      MXRot(re, im, 210, 0.48862124149695496, -0.8724960070727971);
      MXRot(re, im, 211, 0.436409240673342, -0.8997482840522215);
      MXRot(re, im, 212, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 213, 0.32763017956169366, -0.9448060464668779);
      MXRot(re, im, 214, 0.2714404498650743, -0.9624552364536473);
      MXRot(re, im, 215, 0.2143091530650507, -0.9767658813208725);
      MXRot(re, im, 216, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 217, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 218, 0.039259815759068666, -0.9992290362407229);
      MXRot(re, im, 219, -0.019633692460628353, -0.9998072404820648);
      MXRot(re, im, 220, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 221, -0.13701234168196785, -0.9905693404435773);
      MXRot(re, im, 222, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 223, -0.252491577015158, -0.9675990923602598);
      MXRot(re, im, 224, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 225, -0.3644704998791495, -0.9312149347588037);
      MXRot(re, im, 226, -0.4186597375374278, -0.9081431738250815);
      MXRot(re, im, 227, -0.4713967368259977, -0.881921264348355);
      MXRot(re, im, 228, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 229, -0.5717879602276121, -0.8204014435255137);
      MXRot(re, im, 230, -0.6190939493098341, -0.7853169308807448);
      MXRot(re, im, 231, -0.6642524379112817, -0.7475083268625967);
      MXRot(re, im, 232, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 233, -0.7475083268625966, -0.6642524379112819);
      MXRot(re, im, 234, -0.7853169308807447, -0.6190939493098342);
      MXRot(re, im, 235, -0.8204014435255136, -0.5717879602276122);
      MXRot(re, im, 236, -0.8526401643540922, -0.5224985647159489);
      MXRot(re, im, 237, -0.8819212643483549, -0.47139673682599786);
      MXRot(re, im, 238, -0.9081431738250814, -0.41865973753742797);
      MXRot(re, im, 239, -0.9312149347588036, -0.36447049987914965);
      MXRot(re, im, 240, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 241, -0.9675990923602598, -0.2524915770151582);
      MXRot(re, im, 242, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 243, -0.9905693404435773, -0.13701234168196805);
      MXRot(re, im, 244, -0.996917333733128, -0.07845909572784507);
      MXRot(re, im, 245, -0.9998072404820648, -0.019633692460628533);
      MXRot(re, im, 246, -0.9992290362407229, 0.03925981575906871);
      MXRot(re, im, 247, -0.9951847266721969, 0.09801714032956059);
      MXRot(re, im, 248, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 249, -0.9767658813208725, 0.21430915306505052);
      MXRot(re, im, 250, -0.9624552364536474, 0.27144044986507393);
      MXRot(re, im, 251, -0.944806046466878, 0.3276301795616935);
      MXRot(re, im, 252, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 253, -0.8997482840522215, 0.43640924067334186);
      MXRot(re, im, 254, -0.8724960070727971, 0.488621241496955);
      MXRot(re, im, 255, -0.8422172337162865, 0.5391383229110002);
      MXRot(re, im, 257, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 258, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 259, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 260, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 261, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 262, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 263, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 264, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 265, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 266, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 267, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 268, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 269, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 270, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 271, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 272, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 273, 0.23344536385590547, -0.9723699203976766);
      MXRot(re, im, 274, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 275, 0.078459095727845, -0.996917333733128);
      MXRot(re, im, 276, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 277, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 278, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 279, -0.23344536385590534, -0.9723699203976767);
      MXRot(re, im, 280, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 281, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 282, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 283, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 284, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 285, -0.6494480483301835, -0.760405965600031);
      MXRot(re, im, 286, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 287, -0.7604059656000309, -0.6494480483301838);
      MXRot(re, im, 288, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 289, -0.8526401643540922, -0.5224985647159489);
      MXRot(re, im, 290, -0.8910065241883678, -0.45399049973954686);
      MXRot(re, im, 291, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 292, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 293, -0.9723699203976766, -0.23344536385590553);
      MXRot(re, im, 294, -0.9876883405951377, -0.15643446504023098);
      MXRot(re, im, 295, -0.996917333733128, -0.07845909572784507);
      MXRot(re, im, 296, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 297, -0.996917333733128, 0.07845909572784482);
      MXRot(re, im, 298, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 299, -0.9723699203976767, 0.23344536385590528);
      MXRot(re, im, 300, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 301, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 302, -0.8910065241883679, 0.4539904997395467);
      MXRot(re, im, 303, -0.8526401643540923, 0.5224985647159487);
      MXRot(re, im, 304, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 305, -0.760405965600031, 0.6494480483301835);
      MXRot(re, im, 306, -0.7071067811865477, 0.7071067811865475);
      MXRot(re, im, 307, -0.6494480483301841, 0.7604059656000306);
      MXRot(re, im, 308, -0.5877852522924732, 0.8090169943749473);
      MXRot(re, im, 309, -0.5224985647159486, 0.8526401643540924);
      MXRot(re, im, 310, -0.4539904997395469, 0.8910065241883678);
      MXRot(re, im, 311, -0.38268343236509034, 0.9238795325112865);
      MXRot(re, im, 312, -0.30901699437494756, 0.9510565162951535);
      MXRot(re, im, 313, -0.23344536385590514, 0.9723699203976767);
      MXRot(re, im, 314, -0.15643446504023104, 0.9876883405951377);
      MXRot(re, im, 315, -0.07845909572784557, 0.996917333733128);
      MXRot(re, im, 316, -1.8369701987210297e-16, 1.0);
      MXRot(re, im, 317, 0.07845909572784521, 0.996917333733128);
      MXRot(re, im, 318, 0.15643446504023067, 0.9876883405951378);
      MXRot(re, im, 319, 0.23344536385590478, 0.9723699203976768);
      MXTr4(re, im, 0, 16, 32, 48);
      MXTr4(re, im, 1, 17, 33, 49);
      MXTr4(re, im, 2, 18, 34, 50);
      MXTr4(re, im, 3, 19, 35, 51);
      MXTr4(re, im, 4, 20, 36, 52);
      MXTr4(re, im, 5, 21, 37, 53);
      MXTr4(re, im, 6, 22, 38, 54);
      MXTr4(re, im, 7, 23, 39, 55);
      MXTr4(re, im, 8, 24, 40, 56);
      MXTr4(re, im, 9, 25, 41, 57);
      MXTr4(re, im, 10, 26, 42, 58);
      MXTr4(re, im, 11, 27, 43, 59);
      MXTr4(re, im, 12, 28, 44, 60);
      MXTr4(re, im, 13, 29, 45, 61);
      MXTr4(re, im, 14, 30, 46, 62);
      MXTr4(re, im, 15, 31, 47, 63);
      MXRot(re, im, 17, 0.9951847266721969, -0.0980171403295606);
      MXRot(re, im, 18, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 19, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 20, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 21, 0.881921264348355, -0.47139673682599764);
      MXRot(re, im, 22, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 23, 0.773010453362737, -0.6343932841636455);
      MXRot(re, im, 24, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 25, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 26, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 27, 0.4713967368259978, -0.8819212643483549);
      MXRot(re, im, 28, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 29, 0.29028467725446233, -0.9569403357322089);
      MXRot(re, im, 30, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 31, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 33, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 34, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 35, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 36, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 37, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 38, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 39, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 40, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 41, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 42, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 43, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 44, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 45, -0.8314696123025453, -0.5555702330196022);
      MXRot(re, im, 46, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 47, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 49, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 50, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 51, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 52, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 53, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 54, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 55, -0.4713967368259977, -0.881921264348355);
      MXRot(re, im, 56, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 57, -0.8819212643483549, -0.47139673682599786);
      MXRot(re, im, 58, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 59, -0.9951847266721969, 0.09801714032956059);
      MXRot(re, im, 60, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 61, -0.7730104533627371, 0.6343932841636453);
      MXRot(re, im, 62, -0.5555702330196022, 0.8314696123025452);
      MXRot(re, im, 63, -0.29028467725446244, 0.9569403357322088);
      MXTr4(re, im, 0, 4, 8, 12);
      MXTr4(re, im, 1, 5, 9, 13);
      MXTr4(re, im, 2, 6, 10, 14);
      MXTr4(re, im, 3, 7, 11, 15);
      MXRot(re, im, 5, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 6, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 7, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 9, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 10, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 11, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 13, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 14, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 15, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 0, 1, 2, 3);
      MXTr4(re, im, 4, 5, 6, 7);
      MXTr4(re, im, 8, 9, 10, 11);
      MXTr4(re, im, 12, 13, 14, 15);
      MXTr4(re, im, 16, 20, 24, 28);
      MXTr4(re, im, 17, 21, 25, 29);
      MXTr4(re, im, 18, 22, 26, 30);
      MXTr4(re, im, 19, 23, 27, 31);
      MXRot(re, im, 21, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 22, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 23, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 25, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 26, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 27, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 29, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 30, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 31, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 16, 17, 18, 19);
      MXTr4(re, im, 20, 21, 22, 23);
      MXTr4(re, im, 24, 25, 26, 27);
      MXTr4(re, im, 28, 29, 30, 31);
      MXTr4(re, im, 32, 36, 40, 44);
      MXTr4(re, im, 33, 37, 41, 45);
      MXTr4(re, im, 34, 38, 42, 46);
      MXTr4(re, im, 35, 39, 43, 47);
      MXRot(re, im, 37, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 38, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 39, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 41, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 42, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 43, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 45, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 46, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 47, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 32, 33, 34, 35);
      MXTr4(re, im, 36, 37, 38, 39);
      MXTr4(re, im, 40, 41, 42, 43);
      MXTr4(re, im, 44, 45, 46, 47);
      MXTr4(re, im, 48, 52, 56, 60);
      MXTr4(re, im, 49, 53, 57, 61);
      MXTr4(re, im, 50, 54, 58, 62);
      MXTr4(re, im, 51, 55, 59, 63);
      MXRot(re, im, 53, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 54, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 55, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 57, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 58, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 59, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 61, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 62, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 63, -0.9238795325112868, 0.38268343236508967);
    }

    function ApplyMixedRadixFFT_320_Part2(re, im) {
      MXTr4(re, im, 48, 49, 50, 51);
      MXTr4(re, im, 52, 53, 54, 55);
      MXTr4(re, im, 56, 57, 58, 59);
      MXTr4(re, im, 60, 61, 62, 63);
      MXTr4(re, im, 64, 80, 96, 112);
      MXTr4(re, im, 65, 81, 97, 113);
      MXTr4(re, im, 66, 82, 98, 114);
      MXTr4(re, im, 67, 83, 99, 115);
      MXTr4(re, im, 68, 84, 100, 116);
      MXTr4(re, im, 69, 85, 101, 117);
      MXTr4(re, im, 70, 86, 102, 118);
      MXTr4(re, im, 71, 87, 103, 119);
      MXTr4(re, im, 72, 88, 104, 120);
      MXTr4(re, im, 73, 89, 105, 121);
      MXTr4(re, im, 74, 90, 106, 122);
      MXTr4(re, im, 75, 91, 107, 123);
      MXTr4(re, im, 76, 92, 108, 124);
      MXTr4(re, im, 77, 93, 109, 125);
      MXTr4(re, im, 78, 94, 110, 126);
      MXTr4(re, im, 79, 95, 111, 127);
      MXRot(re, im, 81, 0.9951847266721969, -0.0980171403295606);
      MXRot(re, im, 82, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 83, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 84, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 85, 0.881921264348355, -0.47139673682599764);
      MXRot(re, im, 86, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 87, 0.773010453362737, -0.6343932841636455);
      MXRot(re, im, 88, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 89, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 90, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 91, 0.4713967368259978, -0.8819212643483549);
      MXRot(re, im, 92, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 93, 0.29028467725446233, -0.9569403357322089);
      MXRot(re, im, 94, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 95, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 97, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 98, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 99, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 100, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 101, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 102, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 103, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 104, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 105, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 106, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 107, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 108, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 109, -0.8314696123025453, -0.5555702330196022);
      MXRot(re, im, 110, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 111, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 113, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 114, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 115, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 116, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 117, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 118, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 119, -0.4713967368259977, -0.881921264348355);
      MXRot(re, im, 120, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 121, -0.8819212643483549, -0.47139673682599786);
      MXRot(re, im, 122, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 123, -0.9951847266721969, 0.09801714032956059);
      MXRot(re, im, 124, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 125, -0.7730104533627371, 0.6343932841636453);
      MXRot(re, im, 126, -0.5555702330196022, 0.8314696123025452);
      MXRot(re, im, 127, -0.29028467725446244, 0.9569403357322088);
      MXTr4(re, im, 64, 68, 72, 76);
      MXTr4(re, im, 65, 69, 73, 77);
      MXTr4(re, im, 66, 70, 74, 78);
      MXTr4(re, im, 67, 71, 75, 79);
      MXRot(re, im, 69, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 70, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 71, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 73, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 74, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 75, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 77, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 78, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 79, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 64, 65, 66, 67);
      MXTr4(re, im, 68, 69, 70, 71);
      MXTr4(re, im, 72, 73, 74, 75);
      MXTr4(re, im, 76, 77, 78, 79);
      MXTr4(re, im, 80, 84, 88, 92);
      MXTr4(re, im, 81, 85, 89, 93);
      MXTr4(re, im, 82, 86, 90, 94);
      MXTr4(re, im, 83, 87, 91, 95);
      MXRot(re, im, 85, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 86, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 87, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 89, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 90, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 91, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 93, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 94, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 95, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 80, 81, 82, 83);
      MXTr4(re, im, 84, 85, 86, 87);
      MXTr4(re, im, 88, 89, 90, 91);
      MXTr4(re, im, 92, 93, 94, 95);
      MXTr4(re, im, 96, 100, 104, 108);
      MXTr4(re, im, 97, 101, 105, 109);
      MXTr4(re, im, 98, 102, 106, 110);
      MXTr4(re, im, 99, 103, 107, 111);
      MXRot(re, im, 101, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 102, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 103, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 105, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 106, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 107, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 109, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 110, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 111, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 96, 97, 98, 99);
      MXTr4(re, im, 100, 101, 102, 103);
      MXTr4(re, im, 104, 105, 106, 107);
      MXTr4(re, im, 108, 109, 110, 111);
      MXTr4(re, im, 112, 116, 120, 124);
      MXTr4(re, im, 113, 117, 121, 125);
      MXTr4(re, im, 114, 118, 122, 126);
      MXTr4(re, im, 115, 119, 123, 127);
      MXRot(re, im, 117, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 118, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 119, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 121, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 122, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 123, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 125, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 126, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 127, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 112, 113, 114, 115);
      MXTr4(re, im, 116, 117, 118, 119);
      MXTr4(re, im, 120, 121, 122, 123);
      MXTr4(re, im, 124, 125, 126, 127);
      MXTr4(re, im, 128, 144, 160, 176);
      MXTr4(re, im, 129, 145, 161, 177);
      MXTr4(re, im, 130, 146, 162, 178);
      MXTr4(re, im, 131, 147, 163, 179);
      MXTr4(re, im, 132, 148, 164, 180);
      MXTr4(re, im, 133, 149, 165, 181);
      MXTr4(re, im, 134, 150, 166, 182);
      MXTr4(re, im, 135, 151, 167, 183);
      MXTr4(re, im, 136, 152, 168, 184);
      MXTr4(re, im, 137, 153, 169, 185);
      MXTr4(re, im, 138, 154, 170, 186);
      MXTr4(re, im, 139, 155, 171, 187);
      MXTr4(re, im, 140, 156, 172, 188);
      MXTr4(re, im, 141, 157, 173, 189);
      MXTr4(re, im, 142, 158, 174, 190);
      MXTr4(re, im, 143, 159, 175, 191);
      MXRot(re, im, 145, 0.9951847266721969, -0.0980171403295606);
      MXRot(re, im, 146, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 147, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 148, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 149, 0.881921264348355, -0.47139673682599764);
      MXRot(re, im, 150, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 151, 0.773010453362737, -0.6343932841636455);
      MXRot(re, im, 152, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 153, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 154, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 155, 0.4713967368259978, -0.8819212643483549);
      MXRot(re, im, 156, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 157, 0.29028467725446233, -0.9569403357322089);
      MXRot(re, im, 158, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 159, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 161, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 162, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 163, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 164, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 165, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 166, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 167, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 168, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 169, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 170, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 171, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 172, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 173, -0.8314696123025453, -0.5555702330196022);
      MXRot(re, im, 174, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 175, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 177, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 178, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 179, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 180, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 181, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 182, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 183, -0.4713967368259977, -0.881921264348355);
      MXRot(re, im, 184, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 185, -0.8819212643483549, -0.47139673682599786);
      MXRot(re, im, 186, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 187, -0.9951847266721969, 0.09801714032956059);
      MXRot(re, im, 188, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 189, -0.7730104533627371, 0.6343932841636453);
      MXRot(re, im, 190, -0.5555702330196022, 0.8314696123025452);
      MXRot(re, im, 191, -0.29028467725446244, 0.9569403357322088);
      MXTr4(re, im, 128, 132, 136, 140);
      MXTr4(re, im, 129, 133, 137, 141);
      MXTr4(re, im, 130, 134, 138, 142);
      MXTr4(re, im, 131, 135, 139, 143);
      MXRot(re, im, 133, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 134, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 135, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 137, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 138, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 139, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 141, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 142, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 143, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 128, 129, 130, 131);
      MXTr4(re, im, 132, 133, 134, 135);
      MXTr4(re, im, 136, 137, 138, 139);
      MXTr4(re, im, 140, 141, 142, 143);
      MXTr4(re, im, 144, 148, 152, 156);
      MXTr4(re, im, 145, 149, 153, 157);
      MXTr4(re, im, 146, 150, 154, 158);
      MXTr4(re, im, 147, 151, 155, 159);
      MXRot(re, im, 149, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 150, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 151, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 153, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 154, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 155, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 157, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 158, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 159, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 144, 145, 146, 147);
      MXTr4(re, im, 148, 149, 150, 151);
      MXTr4(re, im, 152, 153, 154, 155);
      MXTr4(re, im, 156, 157, 158, 159);
      MXTr4(re, im, 160, 164, 168, 172);
      MXTr4(re, im, 161, 165, 169, 173);
      MXTr4(re, im, 162, 166, 170, 174);
      MXTr4(re, im, 163, 167, 171, 175);
      MXRot(re, im, 165, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 166, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 167, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 169, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 170, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 171, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 173, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 174, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 175, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 160, 161, 162, 163);
      MXTr4(re, im, 164, 165, 166, 167);
      MXTr4(re, im, 168, 169, 170, 171);
      MXTr4(re, im, 172, 173, 174, 175);
      MXTr4(re, im, 176, 180, 184, 188);
      MXTr4(re, im, 177, 181, 185, 189);
      MXTr4(re, im, 178, 182, 186, 190);
      MXTr4(re, im, 179, 183, 187, 191);
      MXRot(re, im, 181, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 182, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 183, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 185, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 186, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 187, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 189, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 190, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 191, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 176, 177, 178, 179);
      MXTr4(re, im, 180, 181, 182, 183);
      MXTr4(re, im, 184, 185, 186, 187);
      MXTr4(re, im, 188, 189, 190, 191);
      MXTr4(re, im, 192, 208, 224, 240);
      MXTr4(re, im, 193, 209, 225, 241);
      MXTr4(re, im, 194, 210, 226, 242);
      MXTr4(re, im, 195, 211, 227, 243);
      MXTr4(re, im, 196, 212, 228, 244);
      MXTr4(re, im, 197, 213, 229, 245);
      MXTr4(re, im, 198, 214, 230, 246);
      MXTr4(re, im, 199, 215, 231, 247);
      MXTr4(re, im, 200, 216, 232, 248);
      MXTr4(re, im, 201, 217, 233, 249);
      MXTr4(re, im, 202, 218, 234, 250);
      MXTr4(re, im, 203, 219, 235, 251);
      MXTr4(re, im, 204, 220, 236, 252);
      MXTr4(re, im, 205, 221, 237, 253);
      MXTr4(re, im, 206, 222, 238, 254);
      MXTr4(re, im, 207, 223, 239, 255);
      MXRot(re, im, 209, 0.9951847266721969, -0.0980171403295606);
      MXRot(re, im, 210, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 211, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 212, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 213, 0.881921264348355, -0.47139673682599764);
      MXRot(re, im, 214, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 215, 0.773010453362737, -0.6343932841636455);
      MXRot(re, im, 216, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 217, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 218, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 219, 0.4713967368259978, -0.8819212643483549);
      MXRot(re, im, 220, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 221, 0.29028467725446233, -0.9569403357322089);
      MXRot(re, im, 222, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 223, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 225, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 226, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 227, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 228, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 229, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 230, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 231, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 232, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 233, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 234, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 235, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 236, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 237, -0.8314696123025453, -0.5555702330196022);
      MXRot(re, im, 238, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 239, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 241, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 242, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 243, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 244, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 245, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 246, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 247, -0.4713967368259977, -0.881921264348355);
      MXRot(re, im, 248, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 249, -0.8819212643483549, -0.47139673682599786);
      MXRot(re, im, 250, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 251, -0.9951847266721969, 0.09801714032956059);
      MXRot(re, im, 252, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 253, -0.7730104533627371, 0.6343932841636453);
      MXRot(re, im, 254, -0.5555702330196022, 0.8314696123025452);
      MXRot(re, im, 255, -0.29028467725446244, 0.9569403357322088);
      MXTr4(re, im, 192, 196, 200, 204);
      MXTr4(re, im, 193, 197, 201, 205);
      MXTr4(re, im, 194, 198, 202, 206);
      MXTr4(re, im, 195, 199, 203, 207);
      MXRot(re, im, 197, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 198, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 199, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 201, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 202, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 203, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 205, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 206, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 207, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 192, 193, 194, 195);
      MXTr4(re, im, 196, 197, 198, 199);
      MXTr4(re, im, 200, 201, 202, 203);
      MXTr4(re, im, 204, 205, 206, 207);
      MXTr4(re, im, 208, 212, 216, 220);
      MXTr4(re, im, 209, 213, 217, 221);
      MXTr4(re, im, 210, 214, 218, 222);
      MXTr4(re, im, 211, 215, 219, 223);
      MXRot(re, im, 213, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 214, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 215, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 217, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 218, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 219, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 221, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 222, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 223, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 208, 209, 210, 211);
      MXTr4(re, im, 212, 213, 214, 215);
      MXTr4(re, im, 216, 217, 218, 219);
      MXTr4(re, im, 220, 221, 222, 223);
      MXTr4(re, im, 224, 228, 232, 236);
      MXTr4(re, im, 225, 229, 233, 237);
      MXTr4(re, im, 226, 230, 234, 238);
      MXTr4(re, im, 227, 231, 235, 239);
      MXRot(re, im, 229, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 230, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 231, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 233, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 234, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 235, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 237, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 238, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 239, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 224, 225, 226, 227);
      MXTr4(re, im, 228, 229, 230, 231);
      MXTr4(re, im, 232, 233, 234, 235);
      MXTr4(re, im, 236, 237, 238, 239);
      MXTr4(re, im, 240, 244, 248, 252);
      MXTr4(re, im, 241, 245, 249, 253);
      MXTr4(re, im, 242, 246, 250, 254);
      MXTr4(re, im, 243, 247, 251, 255);
      MXRot(re, im, 245, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 246, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 247, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 249, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 250, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 251, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 253, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 254, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 255, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 240, 241, 242, 243);
      MXTr4(re, im, 244, 245, 246, 247);
      MXTr4(re, im, 248, 249, 250, 251);
      MXTr4(re, im, 252, 253, 254, 255);
      MXTr4(re, im, 256, 272, 288, 304);
      MXTr4(re, im, 257, 273, 289, 305);
      MXTr4(re, im, 258, 274, 290, 306);
      MXTr4(re, im, 259, 275, 291, 307);
      MXTr4(re, im, 260, 276, 292, 308);
      MXTr4(re, im, 261, 277, 293, 309);
      MXTr4(re, im, 262, 278, 294, 310);
      MXTr4(re, im, 263, 279, 295, 311);
      MXTr4(re, im, 264, 280, 296, 312);
      MXTr4(re, im, 265, 281, 297, 313);
      MXTr4(re, im, 266, 282, 298, 314);
      MXTr4(re, im, 267, 283, 299, 315);
      MXTr4(re, im, 268, 284, 300, 316);
      MXTr4(re, im, 269, 285, 301, 317);
      MXTr4(re, im, 270, 286, 302, 318);
      MXTr4(re, im, 271, 287, 303, 319);
      MXRot(re, im, 273, 0.9951847266721969, -0.0980171403295606);
      MXRot(re, im, 274, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 275, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 276, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 277, 0.881921264348355, -0.47139673682599764);
      MXRot(re, im, 278, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 279, 0.773010453362737, -0.6343932841636455);
      MXRot(re, im, 280, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 281, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 282, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 283, 0.4713967368259978, -0.8819212643483549);
      MXRot(re, im, 284, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 285, 0.29028467725446233, -0.9569403357322089);
      MXRot(re, im, 286, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 287, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 289, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 290, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 291, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 292, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 293, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 294, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 295, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 296, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 297, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 298, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 299, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 300, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 301, -0.8314696123025453, -0.5555702330196022);
      MXRot(re, im, 302, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 303, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 305, 0.9569403357322088, -0.29028467725446233);
      MXRot(re, im, 306, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 307, 0.6343932841636455, -0.773010453362737);
      MXRot(re, im, 308, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 309, 0.09801714032956077, -0.9951847266721968);
      MXRot(re, im, 310, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 311, -0.4713967368259977, -0.881921264348355);
      MXRot(re, im, 312, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 313, -0.8819212643483549, -0.47139673682599786);
      MXRot(re, im, 314, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 315, -0.9951847266721969, 0.09801714032956059);
      MXRot(re, im, 316, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 317, -0.7730104533627371, 0.6343932841636453);
      MXRot(re, im, 318, -0.5555702330196022, 0.8314696123025452);
      MXRot(re, im, 319, -0.29028467725446244, 0.9569403357322088);
      MXTr4(re, im, 256, 260, 264, 268);
      MXTr4(re, im, 257, 261, 265, 269);
      MXTr4(re, im, 258, 262, 266, 270);
      MXTr4(re, im, 259, 263, 267, 271);
      MXRot(re, im, 261, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 262, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 263, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 265, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 266, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 267, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 269, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 270, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 271, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 256, 257, 258, 259);
      MXTr4(re, im, 260, 261, 262, 263);
      MXTr4(re, im, 264, 265, 266, 267);
      MXTr4(re, im, 268, 269, 270, 271);
      MXTr4(re, im, 272, 276, 280, 284);
      MXTr4(re, im, 273, 277, 281, 285);
      MXTr4(re, im, 274, 278, 282, 286);
      MXTr4(re, im, 275, 279, 283, 287);
      MXRot(re, im, 277, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 278, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 279, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 281, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 282, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 283, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 285, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 286, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 287, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 272, 273, 274, 275);
      MXTr4(re, im, 276, 277, 278, 279);
      MXTr4(re, im, 280, 281, 282, 283);
      MXTr4(re, im, 284, 285, 286, 287);
      MXTr4(re, im, 288, 292, 296, 300);
      MXTr4(re, im, 289, 293, 297, 301);
      MXTr4(re, im, 290, 294, 298, 302);
      MXTr4(re, im, 291, 295, 299, 303);
      MXRot(re, im, 293, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 294, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 295, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 297, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 298, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 299, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 301, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 302, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 303, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 288, 289, 290, 291);
      MXTr4(re, im, 292, 293, 294, 295);
      MXTr4(re, im, 296, 297, 298, 299);
      MXTr4(re, im, 300, 301, 302, 303);
      MXTr4(re, im, 304, 308, 312, 316);
      MXTr4(re, im, 305, 309, 313, 317);
      MXTr4(re, im, 306, 310, 314, 318);
      MXTr4(re, im, 307, 311, 315, 319);
      MXRot(re, im, 309, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 310, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 311, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 313, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 314, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 315, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 317, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 318, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 319, -0.9238795325112868, 0.38268343236508967);
      MXTr4(re, im, 304, 305, 306, 307);
      MXTr4(re, im, 308, 309, 310, 311);
      MXTr4(re, im, 312, 313, 314, 315);
      MXTr4(re, im, 316, 317, 318, 319);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
      MXCshft(re, im, CSHFT_INDEXES_4);
      MXCshft(re, im, CSHFT_INDEXES_5);
      MXCshft(re, im, CSHFT_INDEXES_6);
      MXCshft(re, im, CSHFT_INDEXES_7);
    }

    function ApplyMixedRadixFFT_320(re, im) {
      ApplyMixedRadixFFT_320_Part1(re, im);
      ApplyMixedRadixFFT_320_Part2(re, im);
    }

    module.exports = {
      "ApplyMixedRadixFFT_320": ApplyMixedRadixFFT_320
    };
  },
  "lc3/math/fft-mx-360": function lc3MathFftMx360(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr2 = Lc3FftMxBaseOp.MXTr2;
    var MXTr3 = Lc3FftMxBaseOp.MXTr3;
    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXSwap = Lc3FftMxBaseOp.MXSwap;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 72, 182, 145, 28, 240, 3, 216, 133, 256, 129, 310, 41, 84, 296, 141, 82, 152, 190, 37, 204, 295, 69, 308, 239, 355, 71, 110, 50, 48, 246, 93, 260, 9, 306, 95, 62, 146, 100, 14, 324, 299, 357, 215, 61, 74, 326, 101, 86, 98, 278, 279, 351, 125, 22, 150, 46, 102, 158, 280, 15, 54, 336, 137, 202, 151, 118, 284, 303, 221, 85, 26, 96, 134, 328, 245, 21, 78, 272, 189, 307, 167, 178, 286, 105, 32, 186, 91, 116, 140, 10, 36, 132, 184, 289, 321, 83, 224, 301, 77, 200, 7, 162, 160, 16, 126, 94, 332, 191, 109, 320, 11, 108, 248, 237, 211, 115, 68, 236, 139, 346, 107, 176, 142, 154, 334, 335, 65, 20, 6, 90, 44, 300, 5, 18, 270, 45, 30, 42, 156, 136, 130, 40, 12, 180];
    var CSHFT_INDEXES_1 = [2, 144, 298, 285, 33, 258, 273, 261, 81, 80, 8, 234, 337, 209, 313, 257, 201, 79, 344, 305, 23, 222, 157, 208, 241, 75, 56, 138, 274, 333, 263, 225, 31, 114, 338, 281, 87, 170, 52, 192, 181, 73, 254, 327, 173, 268, 243, 219, 349, 323, 227, 175, 70, 38, 276, 135, 58, 282, 159, 352, 197, 199, 343, 233, 265, 27, 168, 250, 39, 348, 251, 111, 122, 148, 244, 291, 123, 220, 13, 252, 183, 217, 205, 25, 24, 294, 339, 353, 269, 315, 59, 354, 341, 89, 314, 329, 317, 203, 223, 229, 319, 347, 179, 358, 287, 177, 214, 331, 119, 356, 143, 226, 103, 230, 49, 318, 275, 63, 218, 277, 207, 169, 322, 155, 64, 290, 51, 120, 4, 288, 249, 309, 311, 113, 266, 99, 350, 53, 264, 297, 213, 259, 345, 35, 60];
    var CSHFT_INDEXES_2 = [17, 198, 271, 117, 212, 187, 163, 232, 193, 253, 255, 57, 210, 43, 228, 247, 165, 34, 330, 47, 174, 340];
    var CSHFT_INDEXES_3 = [19, 342, 161, 88, 242, 147, 172, 196, 127, 166, 106, 104, 302, 149, 316, 131, 112, 194, 325, 29, 312, 185];
    var CSHFT_INDEXES_4 = [55, 66, 92, 188, 235, 67, 164, 304, 293, 267, 171, 124, 292, 195];
    var CSHFT_INDEXES_5 = [76, 128, 238, 283, 231, 121];

    function ApplyMixedRadixFFT_360_Part1(re, im) {
      MXTr5(re, im, 0, 72, 144, 216, 288);
      MXTr5(re, im, 1, 73, 145, 217, 289);
      MXTr5(re, im, 2, 74, 146, 218, 290);
      MXTr5(re, im, 3, 75, 147, 219, 291);
      MXTr5(re, im, 4, 76, 148, 220, 292);
      MXTr5(re, im, 5, 77, 149, 221, 293);
      MXTr5(re, im, 6, 78, 150, 222, 294);
      MXTr5(re, im, 7, 79, 151, 223, 295);
      MXTr5(re, im, 8, 80, 152, 224, 296);
      MXTr5(re, im, 9, 81, 153, 225, 297);
      MXTr5(re, im, 10, 82, 154, 226, 298);
      MXTr5(re, im, 11, 83, 155, 227, 299);
      MXTr5(re, im, 12, 84, 156, 228, 300);
      MXTr5(re, im, 13, 85, 157, 229, 301);
      MXTr5(re, im, 14, 86, 158, 230, 302);
      MXTr5(re, im, 15, 87, 159, 231, 303);
      MXTr5(re, im, 16, 88, 160, 232, 304);
      MXTr5(re, im, 17, 89, 161, 233, 305);
      MXTr5(re, im, 18, 90, 162, 234, 306);
      MXTr5(re, im, 19, 91, 163, 235, 307);
      MXTr5(re, im, 20, 92, 164, 236, 308);
      MXTr5(re, im, 21, 93, 165, 237, 309);
      MXTr5(re, im, 22, 94, 166, 238, 310);
      MXTr5(re, im, 23, 95, 167, 239, 311);
      MXTr5(re, im, 24, 96, 168, 240, 312);
      MXTr5(re, im, 25, 97, 169, 241, 313);
      MXTr5(re, im, 26, 98, 170, 242, 314);
      MXTr5(re, im, 27, 99, 171, 243, 315);
      MXTr5(re, im, 28, 100, 172, 244, 316);
      MXTr5(re, im, 29, 101, 173, 245, 317);
      MXTr5(re, im, 30, 102, 174, 246, 318);
      MXTr5(re, im, 31, 103, 175, 247, 319);
      MXTr5(re, im, 32, 104, 176, 248, 320);
      MXTr5(re, im, 33, 105, 177, 249, 321);
      MXTr5(re, im, 34, 106, 178, 250, 322);
      MXTr5(re, im, 35, 107, 179, 251, 323);
      MXTr5(re, im, 36, 108, 180, 252, 324);
      MXTr5(re, im, 37, 109, 181, 253, 325);
      MXTr5(re, im, 38, 110, 182, 254, 326);
      MXTr5(re, im, 39, 111, 183, 255, 327);
      MXTr5(re, im, 40, 112, 184, 256, 328);
      MXTr5(re, im, 41, 113, 185, 257, 329);
      MXTr5(re, im, 42, 114, 186, 258, 330);
      MXTr5(re, im, 43, 115, 187, 259, 331);
      MXTr5(re, im, 44, 116, 188, 260, 332);
      MXTr5(re, im, 45, 117, 189, 261, 333);
      MXTr5(re, im, 46, 118, 190, 262, 334);
      MXTr5(re, im, 47, 119, 191, 263, 335);
      MXTr5(re, im, 48, 120, 192, 264, 336);
      MXTr5(re, im, 49, 121, 193, 265, 337);
      MXTr5(re, im, 50, 122, 194, 266, 338);
      MXTr5(re, im, 51, 123, 195, 267, 339);
      MXTr5(re, im, 52, 124, 196, 268, 340);
      MXTr5(re, im, 53, 125, 197, 269, 341);
      MXTr5(re, im, 54, 126, 198, 270, 342);
      MXTr5(re, im, 55, 127, 199, 271, 343);
      MXTr5(re, im, 56, 128, 200, 272, 344);
      MXTr5(re, im, 57, 129, 201, 273, 345);
      MXTr5(re, im, 58, 130, 202, 274, 346);
      MXTr5(re, im, 59, 131, 203, 275, 347);
      MXTr5(re, im, 60, 132, 204, 276, 348);
      MXTr5(re, im, 61, 133, 205, 277, 349);
      MXTr5(re, im, 62, 134, 206, 278, 350);
      MXTr5(re, im, 63, 135, 207, 279, 351);
      MXTr5(re, im, 64, 136, 208, 280, 352);
      MXTr5(re, im, 65, 137, 209, 281, 353);
      MXTr5(re, im, 66, 138, 210, 282, 354);
      MXTr5(re, im, 67, 139, 211, 283, 355);
      MXTr5(re, im, 68, 140, 212, 284, 356);
      MXTr5(re, im, 69, 141, 213, 285, 357);
      MXTr5(re, im, 70, 142, 214, 286, 358);
      MXTr5(re, im, 71, 143, 215, 287, 359);
      MXRot(re, im, 73, 0.9998476951563913, -0.01745240643728351);
      MXRot(re, im, 74, 0.9993908270190958, -0.03489949670250097);
      MXRot(re, im, 75, 0.9986295347545738, -0.052335956242943835);
      MXRot(re, im, 76, 0.9975640502598242, -0.0697564737441253);
      MXRot(re, im, 77, 0.9961946980917455, -0.08715574274765817);
      MXRot(re, im, 78, 0.9945218953682733, -0.10452846326765347);
      MXRot(re, im, 79, 0.992546151641322, -0.12186934340514748);
      MXRot(re, im, 80, 0.9902680687415704, -0.13917310096006544);
      MXRot(re, im, 81, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 82, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 83, 0.981627183447664, -0.1908089953765448);
      MXRot(re, im, 84, 0.9781476007338057, -0.20791169081775934);
      MXRot(re, im, 85, 0.9743700647852352, -0.224951054343865);
      MXRot(re, im, 86, 0.9702957262759965, -0.24192189559966773);
      MXRot(re, im, 87, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 88, 0.9612616959383189, -0.27563735581699916);
      MXRot(re, im, 89, 0.9563047559630354, -0.29237170472273677);
      MXRot(re, im, 90, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 91, 0.9455185755993168, -0.3255681544571567);
      MXRot(re, im, 92, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 93, 0.9335804264972017, -0.35836794954530027);
      MXRot(re, im, 94, 0.9271838545667874, -0.374606593415912);
      MXRot(re, im, 95, 0.9205048534524404, -0.39073112848927377);
      MXRot(re, im, 96, 0.9135454576426009, -0.4067366430758002);
      MXRot(re, im, 97, 0.9063077870366499, -0.42261826174069944);
      MXRot(re, im, 98, 0.898794046299167, -0.4383711467890774);
      MXRot(re, im, 99, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 100, 0.882947592858927, -0.4694715627858908);
      MXRot(re, im, 101, 0.8746197071393957, -0.48480962024633706);
      MXRot(re, im, 102, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 103, 0.8571673007021123, -0.5150380749100542);
      MXRot(re, im, 104, 0.848048096156426, -0.5299192642332049);
      MXRot(re, im, 105, 0.838670567945424, -0.5446390350150271);
      MXRot(re, im, 106, 0.8290375725550416, -0.5591929034707469);
      MXRot(re, im, 107, 0.8191520442889918, -0.573576436351046);
      MXRot(re, im, 108, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 109, 0.7986355100472928, -0.6018150231520483);
      MXRot(re, im, 110, 0.7880107536067219, -0.6156614753256583);
      MXRot(re, im, 111, 0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 112, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 113, 0.754709580222772, -0.6560590289905073);
      MXRot(re, im, 114, 0.7431448254773942, -0.6691306063588582);
      MXRot(re, im, 115, 0.7313537016191705, -0.6819983600624985);
      MXRot(re, im, 116, 0.7193398003386512, -0.6946583704589973);
      MXRot(re, im, 117, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 118, 0.6946583704589973, -0.7193398003386511);
      MXRot(re, im, 119, 0.6819983600624985, -0.7313537016191705);
      MXRot(re, im, 120, 0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 121, 0.6560590289905073, -0.754709580222772);
      MXRot(re, im, 122, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 123, 0.6293203910498375, -0.7771459614569709);
      MXRot(re, im, 124, 0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 125, 0.6018150231520484, -0.7986355100472928);
      MXRot(re, im, 126, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 127, 0.5735764363510462, -0.8191520442889918);
      MXRot(re, im, 128, 0.5591929034707468, -0.8290375725550417);
      MXRot(re, im, 129, 0.5446390350150271, -0.838670567945424);
      MXRot(re, im, 130, 0.5299192642332049, -0.848048096156426);
      MXRot(re, im, 131, 0.5150380749100542, -0.8571673007021123);
      MXRot(re, im, 132, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 133, 0.4848096202463371, -0.8746197071393957);
      MXRot(re, im, 134, 0.46947156278589086, -0.8829475928589269);
      MXRot(re, im, 135, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 136, 0.43837114678907746, -0.898794046299167);
      MXRot(re, im, 137, 0.42261826174069944, -0.9063077870366499);
      MXRot(re, im, 138, 0.4067366430758002, -0.9135454576426009);
      MXRot(re, im, 139, 0.3907311284892737, -0.9205048534524404);
      MXRot(re, im, 140, 0.37460659341591196, -0.9271838545667874);
      MXRot(re, im, 141, 0.3583679495453004, -0.9335804264972017);
      MXRot(re, im, 142, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 143, 0.32556815445715676, -0.9455185755993167);
      MXRot(re, im, 145, 0.9993908270190958, -0.03489949670250097);
      MXRot(re, im, 146, 0.9975640502598242, -0.0697564737441253);
      MXRot(re, im, 147, 0.9945218953682733, -0.10452846326765347);
      MXRot(re, im, 148, 0.9902680687415704, -0.13917310096006544);
      MXRot(re, im, 149, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 150, 0.9781476007338057, -0.20791169081775934);
      MXRot(re, im, 151, 0.9702957262759965, -0.24192189559966773);
      MXRot(re, im, 152, 0.9612616959383189, -0.27563735581699916);
      MXRot(re, im, 153, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 154, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 155, 0.9271838545667874, -0.374606593415912);
      MXRot(re, im, 156, 0.9135454576426009, -0.4067366430758002);
      MXRot(re, im, 157, 0.898794046299167, -0.4383711467890774);
      MXRot(re, im, 158, 0.882947592858927, -0.4694715627858908);
      MXRot(re, im, 159, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 160, 0.848048096156426, -0.5299192642332049);
      MXRot(re, im, 161, 0.8290375725550416, -0.5591929034707469);
      MXRot(re, im, 162, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 163, 0.7880107536067219, -0.6156614753256583);
      MXRot(re, im, 164, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 165, 0.7431448254773942, -0.6691306063588582);
      MXRot(re, im, 166, 0.7193398003386512, -0.6946583704589973);
      MXRot(re, im, 167, 0.6946583704589973, -0.7193398003386511);
      MXRot(re, im, 168, 0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 169, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 170, 0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 171, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 172, 0.5591929034707468, -0.8290375725550417);
      MXRot(re, im, 173, 0.5299192642332049, -0.848048096156426);
      MXRot(re, im, 174, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 175, 0.46947156278589086, -0.8829475928589269);
      MXRot(re, im, 176, 0.43837114678907746, -0.898794046299167);
      MXRot(re, im, 177, 0.4067366430758002, -0.9135454576426009);
      MXRot(re, im, 178, 0.37460659341591196, -0.9271838545667874);
      MXRot(re, im, 179, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 180, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 181, 0.27563735581699916, -0.9612616959383189);
      MXRot(re, im, 182, 0.24192189559966767, -0.9702957262759965);
      MXRot(re, im, 183, 0.20791169081775945, -0.9781476007338056);
      MXRot(re, im, 184, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 185, 0.13917310096006547, -0.9902680687415704);
      MXRot(re, im, 186, 0.10452846326765346, -0.9945218953682733);
      MXRot(re, im, 187, 0.06975647374412523, -0.9975640502598242);
      MXRot(re, im, 188, 0.03489949670250108, -0.9993908270190958);
      MXRot(re, im, 189, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 190, -0.034899496702500955, -0.9993908270190958);
      MXRot(re, im, 191, -0.06975647374412533, -0.9975640502598242);
      MXRot(re, im, 192, -0.10452846326765355, -0.9945218953682733);
      MXRot(re, im, 193, -0.13917310096006535, -0.9902680687415704);
      MXRot(re, im, 194, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 195, -0.20791169081775934, -0.9781476007338057);
      MXRot(re, im, 196, -0.24192189559966779, -0.9702957262759965);
      MXRot(re, im, 197, -0.27563735581699905, -0.9612616959383189);
      MXRot(re, im, 198, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 199, -0.3420201433256687, -0.9396926207859084);
      MXRot(re, im, 200, -0.37460659341591207, -0.9271838545667874);
      MXRot(re, im, 201, -0.40673664307580026, -0.9135454576426009);
      MXRot(re, im, 202, -0.4383711467890775, -0.8987940462991669);
      MXRot(re, im, 203, -0.4694715627858909, -0.8829475928589269);
      MXRot(re, im, 204, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 205, -0.5299192642332048, -0.8480480961564261);
      MXRot(re, im, 206, -0.5591929034707467, -0.8290375725550417);
      MXRot(re, im, 207, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 208, -0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 209, -0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 210, -0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 211, -0.6946583704589974, -0.7193398003386511);
      MXRot(re, im, 212, -0.7193398003386512, -0.6946583704589971);
      MXRot(re, im, 213, -0.743144825477394, -0.6691306063588583);
      MXRot(re, im, 214, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 215, -0.7880107536067219, -0.6156614753256584);
      MXRot(re, im, 217, 0.9986295347545738, -0.052335956242943835);
      MXRot(re, im, 218, 0.9945218953682733, -0.10452846326765347);
      MXRot(re, im, 219, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 220, 0.9781476007338057, -0.20791169081775934);
      MXRot(re, im, 221, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 222, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 223, 0.9335804264972017, -0.35836794954530027);
      MXRot(re, im, 224, 0.9135454576426009, -0.4067366430758002);
      MXRot(re, im, 225, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 226, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 227, 0.838670567945424, -0.5446390350150271);
      MXRot(re, im, 228, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 229, 0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 230, 0.7431448254773942, -0.6691306063588582);
      MXRot(re, im, 231, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 232, 0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 233, 0.6293203910498375, -0.7771459614569709);
      MXRot(re, im, 234, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 235, 0.5446390350150271, -0.838670567945424);
      MXRot(re, im, 236, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 237, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 238, 0.4067366430758002, -0.9135454576426009);
      MXRot(re, im, 239, 0.3583679495453004, -0.9335804264972017);
      MXRot(re, im, 240, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 241, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 242, 0.20791169081775945, -0.9781476007338056);
      MXRot(re, im, 243, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 244, 0.10452846326765346, -0.9945218953682733);
      MXRot(re, im, 245, 0.052335956242943966, -0.9986295347545738);
      MXRot(re, im, 246, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 247, -0.05233595624294384, -0.9986295347545738);
      MXRot(re, im, 248, -0.10452846326765355, -0.9945218953682733);
      MXRot(re, im, 249, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 250, -0.20791169081775934, -0.9781476007338057);
      MXRot(re, im, 251, -0.25881904510252085, -0.9659258262890683);
      MXRot(re, im, 252, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 253, -0.35836794954530027, -0.9335804264972017);
      MXRot(re, im, 254, -0.40673664307580026, -0.9135454576426009);
      MXRot(re, im, 255, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 256, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 257, -0.5446390350150271, -0.8386705679454239);
      MXRot(re, im, 258, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 259, -0.6293203910498373, -0.777145961456971);
      MXRot(re, im, 260, -0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 261, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 262, -0.743144825477394, -0.6691306063588583);
      MXRot(re, im, 263, -0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 264, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 265, -0.8386705679454239, -0.5446390350150273);
      MXRot(re, im, 266, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 267, -0.8910065241883678, -0.45399049973954686);
      MXRot(re, im, 268, -0.9135454576426008, -0.40673664307580043);
      MXRot(re, im, 269, -0.9335804264972017, -0.3583679495453002);
      MXRot(re, im, 270, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 271, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 272, -0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 273, -0.9876883405951377, -0.15643446504023098);
      MXRot(re, im, 274, -0.9945218953682733, -0.10452846326765373);
      MXRot(re, im, 275, -0.9986295347545738, -0.05233595624294381);
      MXRot(re, im, 276, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 277, -0.9986295347545738, 0.052335956242943564);
      MXRot(re, im, 278, -0.9945218953682733, 0.1045284632676535);
      MXRot(re, im, 279, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 280, -0.9781476007338056, 0.2079116908177595);
      MXRot(re, im, 281, -0.9659258262890683, 0.2588190451025208);
      MXRot(re, im, 282, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 283, -0.9335804264972017, 0.35836794954530043);
      MXRot(re, im, 284, -0.9135454576426009, 0.4067366430758002);
      MXRot(re, im, 285, -0.8910065241883679, 0.4539904997395467);
      MXRot(re, im, 286, -0.8660254037844386, 0.5000000000000001);
      MXRot(re, im, 287, -0.838670567945424, 0.5446390350150271);
      MXRot(re, im, 289, 0.9975640502598242, -0.0697564737441253);
      MXRot(re, im, 290, 0.9902680687415704, -0.13917310096006544);
      MXRot(re, im, 291, 0.9781476007338057, -0.20791169081775934);
      MXRot(re, im, 292, 0.9612616959383189, -0.27563735581699916);
      MXRot(re, im, 293, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 294, 0.9135454576426009, -0.4067366430758002);
      MXRot(re, im, 295, 0.882947592858927, -0.4694715627858908);
      MXRot(re, im, 296, 0.848048096156426, -0.5299192642332049);
      MXRot(re, im, 297, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 298, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 299, 0.7193398003386512, -0.6946583704589973);
      MXRot(re, im, 300, 0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 301, 0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 302, 0.5591929034707468, -0.8290375725550417);
      MXRot(re, im, 303, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 304, 0.43837114678907746, -0.898794046299167);
      MXRot(re, im, 305, 0.37460659341591196, -0.9271838545667874);
      MXRot(re, im, 306, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 307, 0.24192189559966767, -0.9702957262759965);
      MXRot(re, im, 308, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 309, 0.10452846326765346, -0.9945218953682733);
      MXRot(re, im, 310, 0.03489949670250108, -0.9993908270190958);
      MXRot(re, im, 311, -0.034899496702500955, -0.9993908270190958);
      MXRot(re, im, 312, -0.10452846326765355, -0.9945218953682733);
      MXRot(re, im, 313, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 314, -0.24192189559966779, -0.9702957262759965);
      MXRot(re, im, 315, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 316, -0.37460659341591207, -0.9271838545667874);
      MXRot(re, im, 317, -0.4383711467890775, -0.8987940462991669);
      MXRot(re, im, 318, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 319, -0.5591929034707467, -0.8290375725550417);
      MXRot(re, im, 320, -0.6156614753256583, -0.788010753606722);
      MXRot(re, im, 321, -0.6691306063588582, -0.7431448254773942);
      MXRot(re, im, 322, -0.7193398003386512, -0.6946583704589971);
      MXRot(re, im, 323, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 324, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 325, -0.848048096156426, -0.5299192642332049);
      MXRot(re, im, 326, -0.882947592858927, -0.4694715627858907);
      MXRot(re, im, 327, -0.9135454576426008, -0.40673664307580043);
      MXRot(re, im, 328, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 329, -0.9612616959383189, -0.2756373558169992);
      MXRot(re, im, 330, -0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 331, -0.9902680687415704, -0.13917310096006533);
      MXRot(re, im, 332, -0.9975640502598242, -0.06975647374412552);
      MXRot(re, im, 333, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 334, -0.9975640502598242, 0.06975647374412527);
      MXRot(re, im, 335, -0.9902680687415703, 0.13917310096006552);
      MXRot(re, im, 336, -0.9781476007338056, 0.2079116908177595);
      MXRot(re, im, 337, -0.9612616959383189, 0.275637355816999);
      MXRot(re, im, 338, -0.9396926207859084, 0.34202014332566866);
      MXRot(re, im, 339, -0.9135454576426009, 0.4067366430758002);
      MXRot(re, im, 340, -0.8829475928589269, 0.46947156278589086);
      MXRot(re, im, 341, -0.8480480961564261, 0.5299192642332048);
      MXRot(re, im, 342, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 343, -0.766044443118978, 0.6427876096865393);
      MXRot(re, im, 344, -0.7193398003386511, 0.6946583704589974);
      MXRot(re, im, 345, -0.6691306063588581, 0.7431448254773944);
      MXRot(re, im, 346, -0.6156614753256581, 0.7880107536067221);
      MXRot(re, im, 347, -0.5591929034707466, 0.8290375725550418);
      MXRot(re, im, 348, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 349, -0.43837114678907774, 0.8987940462991668);
      MXRot(re, im, 350, -0.3746065934159123, 0.9271838545667873);
      MXRot(re, im, 351, -0.30901699437494756, 0.9510565162951535);
      MXRot(re, im, 352, -0.24192189559966779, 0.9702957262759965);
      MXRot(re, im, 353, -0.17364817766693033, 0.984807753012208);
      MXRot(re, im, 354, -0.10452846326765336, 0.9945218953682734);
      MXRot(re, im, 355, -0.03489949670250076, 0.9993908270190958);
      MXRot(re, im, 356, 0.03489949670250128, 0.9993908270190958);
      MXRot(re, im, 357, 0.10452846326765299, 0.9945218953682734);
      MXRot(re, im, 358, 0.17364817766692997, 0.9848077530122081);
      MXRot(re, im, 359, 0.24192189559966745, 0.9702957262759966);
      MXTr4(re, im, 0, 18, 36, 54);
      MXTr4(re, im, 1, 19, 37, 55);
      MXTr4(re, im, 2, 20, 38, 56);
      MXTr4(re, im, 3, 21, 39, 57);
      MXTr4(re, im, 4, 22, 40, 58);
      MXTr4(re, im, 5, 23, 41, 59);
      MXTr4(re, im, 6, 24, 42, 60);
      MXTr4(re, im, 7, 25, 43, 61);
      MXTr4(re, im, 8, 26, 44, 62);
      MXTr4(re, im, 9, 27, 45, 63);
      MXTr4(re, im, 10, 28, 46, 64);
      MXTr4(re, im, 11, 29, 47, 65);
      MXTr4(re, im, 12, 30, 48, 66);
      MXTr4(re, im, 13, 31, 49, 67);
      MXTr4(re, im, 14, 32, 50, 68);
      MXTr4(re, im, 15, 33, 51, 69);
      MXTr4(re, im, 16, 34, 52, 70);
      MXTr4(re, im, 17, 35, 53, 71);
      MXRot(re, im, 19, 0.9961946980917455, -0.08715574274765817);
      MXRot(re, im, 20, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 21, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 22, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 23, 0.9063077870366499, -0.42261826174069944);
      MXRot(re, im, 24, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 25, 0.8191520442889918, -0.573576436351046);
      MXRot(re, im, 26, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 27, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 28, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 29, 0.5735764363510462, -0.8191520442889918);
      MXRot(re, im, 30, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 31, 0.42261826174069944, -0.9063077870366499);
      MXRot(re, im, 32, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 33, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 34, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 35, 0.08715574274765836, -0.9961946980917455);
      MXRot(re, im, 37, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 38, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 39, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 40, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 41, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 42, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 43, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 44, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 45, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 46, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 47, -0.3420201433256687, -0.9396926207859084);
      MXRot(re, im, 48, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 49, -0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 50, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 51, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 52, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 53, -0.984807753012208, -0.1736481776669307);
      MXRot(re, im, 55, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 56, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 57, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 58, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 59, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 60, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 61, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 62, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 63, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 64, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 65, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 66, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 67, -0.9659258262890683, 0.2588190451025208);
      MXRot(re, im, 68, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 69, -0.7071067811865477, 0.7071067811865475);
      MXRot(re, im, 70, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 71, -0.25881904510252063, 0.9659258262890683);
      MXTr3(re, im, 0, 6, 12);
      MXTr3(re, im, 1, 7, 13);
      MXTr3(re, im, 2, 8, 14);
      MXTr3(re, im, 3, 9, 15);
      MXTr3(re, im, 4, 10, 16);
      MXTr3(re, im, 5, 11, 17);
      MXRot(re, im, 7, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 8, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 9, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 10, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 11, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 13, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 14, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 15, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 16, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 17, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 0, 2, 4);
      MXTr3(re, im, 1, 3, 5);
      MXRot(re, im, 3, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 5, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 0, 1);
      MXTr2(re, im, 2, 3);
      MXTr2(re, im, 4, 5);
      MXTr3(re, im, 6, 8, 10);
      MXTr3(re, im, 7, 9, 11);
      MXRot(re, im, 9, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 11, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 6, 7);
      MXTr2(re, im, 8, 9);
      MXTr2(re, im, 10, 11);
      MXTr3(re, im, 12, 14, 16);
      MXTr3(re, im, 13, 15, 17);
      MXRot(re, im, 15, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 17, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 12, 13);
      MXTr2(re, im, 14, 15);
      MXTr2(re, im, 16, 17);
      MXTr3(re, im, 18, 24, 30);
      MXTr3(re, im, 19, 25, 31);
      MXTr3(re, im, 20, 26, 32);
      MXTr3(re, im, 21, 27, 33);
      MXTr3(re, im, 22, 28, 34);
      MXTr3(re, im, 23, 29, 35);
      MXRot(re, im, 25, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 26, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 27, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 28, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 29, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 31, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 32, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 33, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 34, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 35, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 18, 20, 22);
      MXTr3(re, im, 19, 21, 23);
      MXRot(re, im, 21, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 23, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 18, 19);
      MXTr2(re, im, 20, 21);
      MXTr2(re, im, 22, 23);
      MXTr3(re, im, 24, 26, 28);
      MXTr3(re, im, 25, 27, 29);
      MXRot(re, im, 27, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 29, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 24, 25);
      MXTr2(re, im, 26, 27);
      MXTr2(re, im, 28, 29);
      MXTr3(re, im, 30, 32, 34);
      MXTr3(re, im, 31, 33, 35);
      MXRot(re, im, 33, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 35, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 30, 31);
      MXTr2(re, im, 32, 33);
      MXTr2(re, im, 34, 35);
      MXTr3(re, im, 36, 42, 48);
      MXTr3(re, im, 37, 43, 49);
      MXTr3(re, im, 38, 44, 50);
      MXTr3(re, im, 39, 45, 51);
      MXTr3(re, im, 40, 46, 52);
      MXTr3(re, im, 41, 47, 53);
      MXRot(re, im, 43, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 44, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 45, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 46, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 47, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 49, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 50, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 51, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 52, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 53, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 36, 38, 40);
      MXTr3(re, im, 37, 39, 41);
      MXRot(re, im, 39, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 41, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 36, 37);
      MXTr2(re, im, 38, 39);
      MXTr2(re, im, 40, 41);
      MXTr3(re, im, 42, 44, 46);
      MXTr3(re, im, 43, 45, 47);
      MXRot(re, im, 45, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 47, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 42, 43);
      MXTr2(re, im, 44, 45);
      MXTr2(re, im, 46, 47);
      MXTr3(re, im, 48, 50, 52);
      MXTr3(re, im, 49, 51, 53);
      MXRot(re, im, 51, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 53, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 48, 49);
      MXTr2(re, im, 50, 51);
      MXTr2(re, im, 52, 53);
      MXTr3(re, im, 54, 60, 66);
      MXTr3(re, im, 55, 61, 67);
      MXTr3(re, im, 56, 62, 68);
      MXTr3(re, im, 57, 63, 69);
      MXTr3(re, im, 58, 64, 70);
      MXTr3(re, im, 59, 65, 71);
      MXRot(re, im, 61, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 62, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 63, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 64, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 65, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 67, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 68, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 69, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 70, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 71, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 54, 56, 58);
      MXTr3(re, im, 55, 57, 59);
      MXRot(re, im, 57, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 59, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 54, 55);
      MXTr2(re, im, 56, 57);
      MXTr2(re, im, 58, 59);
      MXTr3(re, im, 60, 62, 64);
      MXTr3(re, im, 61, 63, 65);
      MXRot(re, im, 63, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 65, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 60, 61);
      MXTr2(re, im, 62, 63);
      MXTr2(re, im, 64, 65);
      MXTr3(re, im, 66, 68, 70);
      MXTr3(re, im, 67, 69, 71);
      MXRot(re, im, 69, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 71, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 66, 67);
      MXTr2(re, im, 68, 69);
      MXTr2(re, im, 70, 71);
      MXTr4(re, im, 72, 90, 108, 126);
      MXTr4(re, im, 73, 91, 109, 127);
      MXTr4(re, im, 74, 92, 110, 128);
      MXTr4(re, im, 75, 93, 111, 129);
      MXTr4(re, im, 76, 94, 112, 130);
      MXTr4(re, im, 77, 95, 113, 131);
      MXTr4(re, im, 78, 96, 114, 132);
      MXTr4(re, im, 79, 97, 115, 133);
      MXTr4(re, im, 80, 98, 116, 134);
      MXTr4(re, im, 81, 99, 117, 135);
      MXTr4(re, im, 82, 100, 118, 136);
      MXTr4(re, im, 83, 101, 119, 137);
      MXTr4(re, im, 84, 102, 120, 138);
      MXTr4(re, im, 85, 103, 121, 139);
      MXTr4(re, im, 86, 104, 122, 140);
      MXTr4(re, im, 87, 105, 123, 141);
      MXTr4(re, im, 88, 106, 124, 142);
      MXTr4(re, im, 89, 107, 125, 143);
      MXRot(re, im, 91, 0.9961946980917455, -0.08715574274765817);
      MXRot(re, im, 92, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 93, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 94, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 95, 0.9063077870366499, -0.42261826174069944);
      MXRot(re, im, 96, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 97, 0.8191520442889918, -0.573576436351046);
      MXRot(re, im, 98, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 99, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 100, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 101, 0.5735764363510462, -0.8191520442889918);
      MXRot(re, im, 102, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 103, 0.42261826174069944, -0.9063077870366499);
      MXRot(re, im, 104, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 105, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 106, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 107, 0.08715574274765836, -0.9961946980917455);
      MXRot(re, im, 109, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 110, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 111, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 112, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 113, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 114, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 115, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 116, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 117, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 118, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 119, -0.3420201433256687, -0.9396926207859084);
      MXRot(re, im, 120, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 121, -0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 122, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 123, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 124, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 125, -0.984807753012208, -0.1736481776669307);
      MXRot(re, im, 127, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 128, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 129, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 130, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 131, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 132, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 133, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 134, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 135, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 136, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 137, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 138, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 139, -0.9659258262890683, 0.2588190451025208);
      MXRot(re, im, 140, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 141, -0.7071067811865477, 0.7071067811865475);
      MXRot(re, im, 142, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 143, -0.25881904510252063, 0.9659258262890683);
    }

    function ApplyMixedRadixFFT_360_Part2(re, im) {
      MXTr3(re, im, 72, 78, 84);
      MXTr3(re, im, 73, 79, 85);
      MXTr3(re, im, 74, 80, 86);
      MXTr3(re, im, 75, 81, 87);
      MXTr3(re, im, 76, 82, 88);
      MXTr3(re, im, 77, 83, 89);
      MXRot(re, im, 79, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 80, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 81, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 82, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 83, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 85, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 86, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 87, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 88, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 89, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 72, 74, 76);
      MXTr3(re, im, 73, 75, 77);
      MXRot(re, im, 75, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 77, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 72, 73);
      MXTr2(re, im, 74, 75);
      MXTr2(re, im, 76, 77);
      MXTr3(re, im, 78, 80, 82);
      MXTr3(re, im, 79, 81, 83);
      MXRot(re, im, 81, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 83, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 78, 79);
      MXTr2(re, im, 80, 81);
      MXTr2(re, im, 82, 83);
      MXTr3(re, im, 84, 86, 88);
      MXTr3(re, im, 85, 87, 89);
      MXRot(re, im, 87, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 89, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 84, 85);
      MXTr2(re, im, 86, 87);
      MXTr2(re, im, 88, 89);
      MXTr3(re, im, 90, 96, 102);
      MXTr3(re, im, 91, 97, 103);
      MXTr3(re, im, 92, 98, 104);
      MXTr3(re, im, 93, 99, 105);
      MXTr3(re, im, 94, 100, 106);
      MXTr3(re, im, 95, 101, 107);
      MXRot(re, im, 97, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 98, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 99, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 100, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 101, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 103, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 104, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 105, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 106, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 107, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 90, 92, 94);
      MXTr3(re, im, 91, 93, 95);
      MXRot(re, im, 93, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 95, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 90, 91);
      MXTr2(re, im, 92, 93);
      MXTr2(re, im, 94, 95);
      MXTr3(re, im, 96, 98, 100);
      MXTr3(re, im, 97, 99, 101);
      MXRot(re, im, 99, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 101, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 96, 97);
      MXTr2(re, im, 98, 99);
      MXTr2(re, im, 100, 101);
      MXTr3(re, im, 102, 104, 106);
      MXTr3(re, im, 103, 105, 107);
      MXRot(re, im, 105, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 107, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 102, 103);
      MXTr2(re, im, 104, 105);
      MXTr2(re, im, 106, 107);
      MXTr3(re, im, 108, 114, 120);
      MXTr3(re, im, 109, 115, 121);
      MXTr3(re, im, 110, 116, 122);
      MXTr3(re, im, 111, 117, 123);
      MXTr3(re, im, 112, 118, 124);
      MXTr3(re, im, 113, 119, 125);
      MXRot(re, im, 115, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 116, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 117, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 118, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 119, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 121, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 122, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 123, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 124, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 125, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 108, 110, 112);
      MXTr3(re, im, 109, 111, 113);
      MXRot(re, im, 111, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 113, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 108, 109);
      MXTr2(re, im, 110, 111);
      MXTr2(re, im, 112, 113);
      MXTr3(re, im, 114, 116, 118);
      MXTr3(re, im, 115, 117, 119);
      MXRot(re, im, 117, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 119, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 114, 115);
      MXTr2(re, im, 116, 117);
      MXTr2(re, im, 118, 119);
      MXTr3(re, im, 120, 122, 124);
      MXTr3(re, im, 121, 123, 125);
      MXRot(re, im, 123, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 125, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 120, 121);
      MXTr2(re, im, 122, 123);
      MXTr2(re, im, 124, 125);
      MXTr3(re, im, 126, 132, 138);
      MXTr3(re, im, 127, 133, 139);
      MXTr3(re, im, 128, 134, 140);
      MXTr3(re, im, 129, 135, 141);
      MXTr3(re, im, 130, 136, 142);
      MXTr3(re, im, 131, 137, 143);
      MXRot(re, im, 133, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 134, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 135, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 136, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 137, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 139, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 140, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 141, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 142, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 143, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 126, 128, 130);
      MXTr3(re, im, 127, 129, 131);
      MXRot(re, im, 129, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 131, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 126, 127);
      MXTr2(re, im, 128, 129);
      MXTr2(re, im, 130, 131);
      MXTr3(re, im, 132, 134, 136);
      MXTr3(re, im, 133, 135, 137);
      MXRot(re, im, 135, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 137, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 132, 133);
      MXTr2(re, im, 134, 135);
      MXTr2(re, im, 136, 137);
      MXTr3(re, im, 138, 140, 142);
      MXTr3(re, im, 139, 141, 143);
      MXRot(re, im, 141, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 143, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 138, 139);
      MXTr2(re, im, 140, 141);
      MXTr2(re, im, 142, 143);
      MXTr4(re, im, 144, 162, 180, 198);
      MXTr4(re, im, 145, 163, 181, 199);
      MXTr4(re, im, 146, 164, 182, 200);
      MXTr4(re, im, 147, 165, 183, 201);
      MXTr4(re, im, 148, 166, 184, 202);
      MXTr4(re, im, 149, 167, 185, 203);
      MXTr4(re, im, 150, 168, 186, 204);
      MXTr4(re, im, 151, 169, 187, 205);
      MXTr4(re, im, 152, 170, 188, 206);
      MXTr4(re, im, 153, 171, 189, 207);
      MXTr4(re, im, 154, 172, 190, 208);
      MXTr4(re, im, 155, 173, 191, 209);
      MXTr4(re, im, 156, 174, 192, 210);
      MXTr4(re, im, 157, 175, 193, 211);
      MXTr4(re, im, 158, 176, 194, 212);
      MXTr4(re, im, 159, 177, 195, 213);
      MXTr4(re, im, 160, 178, 196, 214);
      MXTr4(re, im, 161, 179, 197, 215);
      MXRot(re, im, 163, 0.9961946980917455, -0.08715574274765817);
      MXRot(re, im, 164, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 165, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 166, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 167, 0.9063077870366499, -0.42261826174069944);
      MXRot(re, im, 168, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 169, 0.8191520442889918, -0.573576436351046);
      MXRot(re, im, 170, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 171, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 172, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 173, 0.5735764363510462, -0.8191520442889918);
      MXRot(re, im, 174, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 175, 0.42261826174069944, -0.9063077870366499);
      MXRot(re, im, 176, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 177, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 178, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 179, 0.08715574274765836, -0.9961946980917455);
      MXRot(re, im, 181, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 182, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 183, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 184, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 185, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 186, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 187, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 188, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 189, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 190, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 191, -0.3420201433256687, -0.9396926207859084);
      MXRot(re, im, 192, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 193, -0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 194, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 195, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 196, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 197, -0.984807753012208, -0.1736481776669307);
      MXRot(re, im, 199, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 200, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 201, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 202, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 203, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 204, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 205, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 206, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 207, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 208, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 209, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 210, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 211, -0.9659258262890683, 0.2588190451025208);
      MXRot(re, im, 212, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 213, -0.7071067811865477, 0.7071067811865475);
      MXRot(re, im, 214, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 215, -0.25881904510252063, 0.9659258262890683);
      MXTr3(re, im, 144, 150, 156);
      MXTr3(re, im, 145, 151, 157);
      MXTr3(re, im, 146, 152, 158);
      MXTr3(re, im, 147, 153, 159);
      MXTr3(re, im, 148, 154, 160);
      MXTr3(re, im, 149, 155, 161);
      MXRot(re, im, 151, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 152, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 153, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 154, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 155, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 157, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 158, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 159, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 160, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 161, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 144, 146, 148);
      MXTr3(re, im, 145, 147, 149);
      MXRot(re, im, 147, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 149, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 144, 145);
      MXTr2(re, im, 146, 147);
      MXTr2(re, im, 148, 149);
      MXTr3(re, im, 150, 152, 154);
      MXTr3(re, im, 151, 153, 155);
      MXRot(re, im, 153, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 155, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 150, 151);
      MXTr2(re, im, 152, 153);
      MXTr2(re, im, 154, 155);
      MXTr3(re, im, 156, 158, 160);
      MXTr3(re, im, 157, 159, 161);
      MXRot(re, im, 159, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 161, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 156, 157);
      MXTr2(re, im, 158, 159);
      MXTr2(re, im, 160, 161);
      MXTr3(re, im, 162, 168, 174);
      MXTr3(re, im, 163, 169, 175);
      MXTr3(re, im, 164, 170, 176);
      MXTr3(re, im, 165, 171, 177);
      MXTr3(re, im, 166, 172, 178);
      MXTr3(re, im, 167, 173, 179);
      MXRot(re, im, 169, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 170, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 171, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 172, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 173, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 175, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 176, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 177, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 178, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 179, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 162, 164, 166);
      MXTr3(re, im, 163, 165, 167);
      MXRot(re, im, 165, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 167, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 162, 163);
      MXTr2(re, im, 164, 165);
      MXTr2(re, im, 166, 167);
      MXTr3(re, im, 168, 170, 172);
      MXTr3(re, im, 169, 171, 173);
      MXRot(re, im, 171, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 173, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 168, 169);
      MXTr2(re, im, 170, 171);
      MXTr2(re, im, 172, 173);
      MXTr3(re, im, 174, 176, 178);
      MXTr3(re, im, 175, 177, 179);
      MXRot(re, im, 177, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 179, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 174, 175);
      MXTr2(re, im, 176, 177);
      MXTr2(re, im, 178, 179);
      MXTr3(re, im, 180, 186, 192);
      MXTr3(re, im, 181, 187, 193);
      MXTr3(re, im, 182, 188, 194);
      MXTr3(re, im, 183, 189, 195);
      MXTr3(re, im, 184, 190, 196);
      MXTr3(re, im, 185, 191, 197);
      MXRot(re, im, 187, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 188, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 189, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 190, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 191, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 193, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 194, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 195, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 196, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 197, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 180, 182, 184);
      MXTr3(re, im, 181, 183, 185);
      MXRot(re, im, 183, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 185, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 180, 181);
      MXTr2(re, im, 182, 183);
      MXTr2(re, im, 184, 185);
      MXTr3(re, im, 186, 188, 190);
      MXTr3(re, im, 187, 189, 191);
      MXRot(re, im, 189, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 191, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 186, 187);
      MXTr2(re, im, 188, 189);
      MXTr2(re, im, 190, 191);
      MXTr3(re, im, 192, 194, 196);
      MXTr3(re, im, 193, 195, 197);
      MXRot(re, im, 195, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 197, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 192, 193);
      MXTr2(re, im, 194, 195);
      MXTr2(re, im, 196, 197);
      MXTr3(re, im, 198, 204, 210);
      MXTr3(re, im, 199, 205, 211);
      MXTr3(re, im, 200, 206, 212);
      MXTr3(re, im, 201, 207, 213);
      MXTr3(re, im, 202, 208, 214);
      MXTr3(re, im, 203, 209, 215);
      MXRot(re, im, 205, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 206, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 207, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 208, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 209, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 211, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 212, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 213, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 214, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 215, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 198, 200, 202);
      MXTr3(re, im, 199, 201, 203);
      MXRot(re, im, 201, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 203, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 198, 199);
      MXTr2(re, im, 200, 201);
      MXTr2(re, im, 202, 203);
      MXTr3(re, im, 204, 206, 208);
      MXTr3(re, im, 205, 207, 209);
      MXRot(re, im, 207, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 209, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 204, 205);
      MXTr2(re, im, 206, 207);
      MXTr2(re, im, 208, 209);
      MXTr3(re, im, 210, 212, 214);
      MXTr3(re, im, 211, 213, 215);
      MXRot(re, im, 213, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 215, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 210, 211);
      MXTr2(re, im, 212, 213);
      MXTr2(re, im, 214, 215);
      MXTr4(re, im, 216, 234, 252, 270);
      MXTr4(re, im, 217, 235, 253, 271);
      MXTr4(re, im, 218, 236, 254, 272);
      MXTr4(re, im, 219, 237, 255, 273);
      MXTr4(re, im, 220, 238, 256, 274);
      MXTr4(re, im, 221, 239, 257, 275);
      MXTr4(re, im, 222, 240, 258, 276);
      MXTr4(re, im, 223, 241, 259, 277);
      MXTr4(re, im, 224, 242, 260, 278);
      MXTr4(re, im, 225, 243, 261, 279);
      MXTr4(re, im, 226, 244, 262, 280);
      MXTr4(re, im, 227, 245, 263, 281);
      MXTr4(re, im, 228, 246, 264, 282);
      MXTr4(re, im, 229, 247, 265, 283);
      MXTr4(re, im, 230, 248, 266, 284);
      MXTr4(re, im, 231, 249, 267, 285);
      MXTr4(re, im, 232, 250, 268, 286);
      MXTr4(re, im, 233, 251, 269, 287);
      MXRot(re, im, 235, 0.9961946980917455, -0.08715574274765817);
      MXRot(re, im, 236, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 237, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 238, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 239, 0.9063077870366499, -0.42261826174069944);
      MXRot(re, im, 240, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 241, 0.8191520442889918, -0.573576436351046);
      MXRot(re, im, 242, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 243, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 244, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 245, 0.5735764363510462, -0.8191520442889918);
      MXRot(re, im, 246, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 247, 0.42261826174069944, -0.9063077870366499);
      MXRot(re, im, 248, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 249, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 250, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 251, 0.08715574274765836, -0.9961946980917455);
      MXRot(re, im, 253, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 254, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 255, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 256, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 257, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 258, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 259, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 260, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 261, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 262, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 263, -0.3420201433256687, -0.9396926207859084);
      MXRot(re, im, 264, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 265, -0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 266, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 267, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 268, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 269, -0.984807753012208, -0.1736481776669307);
      MXRot(re, im, 271, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 272, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 273, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 274, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 275, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 276, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 277, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 278, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 279, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 280, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 281, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 282, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 283, -0.9659258262890683, 0.2588190451025208);
      MXRot(re, im, 284, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 285, -0.7071067811865477, 0.7071067811865475);
      MXRot(re, im, 286, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 287, -0.25881904510252063, 0.9659258262890683);
      MXTr3(re, im, 216, 222, 228);
      MXTr3(re, im, 217, 223, 229);
      MXTr3(re, im, 218, 224, 230);
      MXTr3(re, im, 219, 225, 231);
      MXTr3(re, im, 220, 226, 232);
      MXTr3(re, im, 221, 227, 233);
      MXRot(re, im, 223, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 224, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 225, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 226, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 227, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 229, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 230, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 231, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 232, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 233, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 216, 218, 220);
      MXTr3(re, im, 217, 219, 221);
      MXRot(re, im, 219, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 221, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 216, 217);
      MXTr2(re, im, 218, 219);
      MXTr2(re, im, 220, 221);
      MXTr3(re, im, 222, 224, 226);
      MXTr3(re, im, 223, 225, 227);
      MXRot(re, im, 225, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 227, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 222, 223);
      MXTr2(re, im, 224, 225);
      MXTr2(re, im, 226, 227);
      MXTr3(re, im, 228, 230, 232);
      MXTr3(re, im, 229, 231, 233);
      MXRot(re, im, 231, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 233, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 228, 229);
      MXTr2(re, im, 230, 231);
      MXTr2(re, im, 232, 233);
      MXTr3(re, im, 234, 240, 246);
      MXTr3(re, im, 235, 241, 247);
      MXTr3(re, im, 236, 242, 248);
      MXTr3(re, im, 237, 243, 249);
      MXTr3(re, im, 238, 244, 250);
      MXTr3(re, im, 239, 245, 251);
      MXRot(re, im, 241, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 242, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 243, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 244, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 245, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 247, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 248, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 249, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 250, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 251, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 234, 236, 238);
      MXTr3(re, im, 235, 237, 239);
      MXRot(re, im, 237, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 239, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 234, 235);
      MXTr2(re, im, 236, 237);
      MXTr2(re, im, 238, 239);
      MXTr3(re, im, 240, 242, 244);
      MXTr3(re, im, 241, 243, 245);
      MXRot(re, im, 243, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 245, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 240, 241);
      MXTr2(re, im, 242, 243);
      MXTr2(re, im, 244, 245);
      MXTr3(re, im, 246, 248, 250);
      MXTr3(re, im, 247, 249, 251);
      MXRot(re, im, 249, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 251, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 246, 247);
      MXTr2(re, im, 248, 249);
      MXTr2(re, im, 250, 251);
      MXTr3(re, im, 252, 258, 264);
      MXTr3(re, im, 253, 259, 265);
      MXTr3(re, im, 254, 260, 266);
      MXTr3(re, im, 255, 261, 267);
      MXTr3(re, im, 256, 262, 268);
      MXTr3(re, im, 257, 263, 269);
      MXRot(re, im, 259, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 260, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 261, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 262, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 263, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 265, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 266, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 267, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 268, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 269, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 252, 254, 256);
      MXTr3(re, im, 253, 255, 257);
      MXRot(re, im, 255, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 257, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 252, 253);
      MXTr2(re, im, 254, 255);
      MXTr2(re, im, 256, 257);
      MXTr3(re, im, 258, 260, 262);
      MXTr3(re, im, 259, 261, 263);
      MXRot(re, im, 261, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 263, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 258, 259);
      MXTr2(re, im, 260, 261);
      MXTr2(re, im, 262, 263);
      MXTr3(re, im, 264, 266, 268);
      MXTr3(re, im, 265, 267, 269);
      MXRot(re, im, 267, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 269, -0.4999999999999998, -0.8660254037844387);
    }

    function ApplyMixedRadixFFT_360_Part3(re, im) {
      MXTr2(re, im, 264, 265);
      MXTr2(re, im, 266, 267);
      MXTr2(re, im, 268, 269);
      MXTr3(re, im, 270, 276, 282);
      MXTr3(re, im, 271, 277, 283);
      MXTr3(re, im, 272, 278, 284);
      MXTr3(re, im, 273, 279, 285);
      MXTr3(re, im, 274, 280, 286);
      MXTr3(re, im, 275, 281, 287);
      MXRot(re, im, 277, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 278, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 279, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 280, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 281, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 283, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 284, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 285, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 286, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 287, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 270, 272, 274);
      MXTr3(re, im, 271, 273, 275);
      MXRot(re, im, 273, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 275, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 270, 271);
      MXTr2(re, im, 272, 273);
      MXTr2(re, im, 274, 275);
      MXTr3(re, im, 276, 278, 280);
      MXTr3(re, im, 277, 279, 281);
      MXRot(re, im, 279, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 281, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 276, 277);
      MXTr2(re, im, 278, 279);
      MXTr2(re, im, 280, 281);
      MXTr3(re, im, 282, 284, 286);
      MXTr3(re, im, 283, 285, 287);
      MXRot(re, im, 285, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 287, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 282, 283);
      MXTr2(re, im, 284, 285);
      MXTr2(re, im, 286, 287);
      MXTr4(re, im, 288, 306, 324, 342);
      MXTr4(re, im, 289, 307, 325, 343);
      MXTr4(re, im, 290, 308, 326, 344);
      MXTr4(re, im, 291, 309, 327, 345);
      MXTr4(re, im, 292, 310, 328, 346);
      MXTr4(re, im, 293, 311, 329, 347);
      MXTr4(re, im, 294, 312, 330, 348);
      MXTr4(re, im, 295, 313, 331, 349);
      MXTr4(re, im, 296, 314, 332, 350);
      MXTr4(re, im, 297, 315, 333, 351);
      MXTr4(re, im, 298, 316, 334, 352);
      MXTr4(re, im, 299, 317, 335, 353);
      MXTr4(re, im, 300, 318, 336, 354);
      MXTr4(re, im, 301, 319, 337, 355);
      MXTr4(re, im, 302, 320, 338, 356);
      MXTr4(re, im, 303, 321, 339, 357);
      MXTr4(re, im, 304, 322, 340, 358);
      MXTr4(re, im, 305, 323, 341, 359);
      MXRot(re, im, 307, 0.9961946980917455, -0.08715574274765817);
      MXRot(re, im, 308, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 309, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 310, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 311, 0.9063077870366499, -0.42261826174069944);
      MXRot(re, im, 312, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 313, 0.8191520442889918, -0.573576436351046);
      MXRot(re, im, 314, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 315, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 316, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 317, 0.5735764363510462, -0.8191520442889918);
      MXRot(re, im, 318, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 319, 0.42261826174069944, -0.9063077870366499);
      MXRot(re, im, 320, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 321, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 322, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 323, 0.08715574274765836, -0.9961946980917455);
      MXRot(re, im, 325, 0.984807753012208, -0.17364817766693033);
      MXRot(re, im, 326, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 327, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 328, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 329, 0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 330, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 331, 0.3420201433256688, -0.9396926207859083);
      MXRot(re, im, 332, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 333, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 334, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 335, -0.3420201433256687, -0.9396926207859084);
      MXRot(re, im, 336, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 337, -0.6427876096865394, -0.766044443118978);
      MXRot(re, im, 338, -0.7660444431189779, -0.6427876096865395);
      MXRot(re, im, 339, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 340, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 341, -0.984807753012208, -0.1736481776669307);
      MXRot(re, im, 343, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 344, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 345, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 346, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 347, 0.25881904510252074, -0.9659258262890683);
      MXRot(re, im, 348, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 349, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 350, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 351, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 352, -0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 353, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 354, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 355, -0.9659258262890683, 0.2588190451025208);
      MXRot(re, im, 356, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 357, -0.7071067811865477, 0.7071067811865475);
      MXRot(re, im, 358, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 359, -0.25881904510252063, 0.9659258262890683);
      MXTr3(re, im, 288, 294, 300);
      MXTr3(re, im, 289, 295, 301);
      MXTr3(re, im, 290, 296, 302);
      MXTr3(re, im, 291, 297, 303);
      MXTr3(re, im, 292, 298, 304);
      MXTr3(re, im, 293, 299, 305);
      MXRot(re, im, 295, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 296, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 297, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 298, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 299, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 301, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 302, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 303, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 304, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 305, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 288, 290, 292);
      MXTr3(re, im, 289, 291, 293);
      MXRot(re, im, 291, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 293, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 288, 289);
      MXTr2(re, im, 290, 291);
      MXTr2(re, im, 292, 293);
      MXTr3(re, im, 294, 296, 298);
      MXTr3(re, im, 295, 297, 299);
      MXRot(re, im, 297, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 299, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 294, 295);
      MXTr2(re, im, 296, 297);
      MXTr2(re, im, 298, 299);
      MXTr3(re, im, 300, 302, 304);
      MXTr3(re, im, 301, 303, 305);
      MXRot(re, im, 303, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 305, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 300, 301);
      MXTr2(re, im, 302, 303);
      MXTr2(re, im, 304, 305);
      MXTr3(re, im, 306, 312, 318);
      MXTr3(re, im, 307, 313, 319);
      MXTr3(re, im, 308, 314, 320);
      MXTr3(re, im, 309, 315, 321);
      MXTr3(re, im, 310, 316, 322);
      MXTr3(re, im, 311, 317, 323);
      MXRot(re, im, 313, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 314, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 315, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 316, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 317, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 319, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 320, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 321, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 322, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 323, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 306, 308, 310);
      MXTr3(re, im, 307, 309, 311);
      MXRot(re, im, 309, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 311, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 306, 307);
      MXTr2(re, im, 308, 309);
      MXTr2(re, im, 310, 311);
      MXTr3(re, im, 312, 314, 316);
      MXTr3(re, im, 313, 315, 317);
      MXRot(re, im, 315, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 317, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 312, 313);
      MXTr2(re, im, 314, 315);
      MXTr2(re, im, 316, 317);
      MXTr3(re, im, 318, 320, 322);
      MXTr3(re, im, 319, 321, 323);
      MXRot(re, im, 321, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 323, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 318, 319);
      MXTr2(re, im, 320, 321);
      MXTr2(re, im, 322, 323);
      MXTr3(re, im, 324, 330, 336);
      MXTr3(re, im, 325, 331, 337);
      MXTr3(re, im, 326, 332, 338);
      MXTr3(re, im, 327, 333, 339);
      MXTr3(re, im, 328, 334, 340);
      MXTr3(re, im, 329, 335, 341);
      MXRot(re, im, 331, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 332, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 333, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 334, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 335, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 337, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 338, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 339, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 340, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 341, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 324, 326, 328);
      MXTr3(re, im, 325, 327, 329);
      MXRot(re, im, 327, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 329, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 324, 325);
      MXTr2(re, im, 326, 327);
      MXTr2(re, im, 328, 329);
      MXTr3(re, im, 330, 332, 334);
      MXTr3(re, im, 331, 333, 335);
      MXRot(re, im, 333, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 335, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 330, 331);
      MXTr2(re, im, 332, 333);
      MXTr2(re, im, 334, 335);
      MXTr3(re, im, 336, 338, 340);
      MXTr3(re, im, 337, 339, 341);
      MXRot(re, im, 339, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 341, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 336, 337);
      MXTr2(re, im, 338, 339);
      MXTr2(re, im, 340, 341);
      MXTr3(re, im, 342, 348, 354);
      MXTr3(re, im, 343, 349, 355);
      MXTr3(re, im, 344, 350, 356);
      MXTr3(re, im, 345, 351, 357);
      MXTr3(re, im, 346, 352, 358);
      MXTr3(re, im, 347, 353, 359);
      MXRot(re, im, 349, 0.9396926207859084, -0.3420201433256687);
      MXRot(re, im, 350, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 351, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 352, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 353, -0.1736481776669303, -0.984807753012208);
      MXRot(re, im, 355, 0.766044443118978, -0.6427876096865393);
      MXRot(re, im, 356, 0.17364817766693041, -0.984807753012208);
      MXRot(re, im, 357, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 358, -0.9396926207859083, -0.3420201433256689);
      MXRot(re, im, 359, -0.9396926207859084, 0.34202014332566866);
      MXTr3(re, im, 342, 344, 346);
      MXTr3(re, im, 343, 345, 347);
      MXRot(re, im, 345, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 347, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 342, 343);
      MXTr2(re, im, 344, 345);
      MXTr2(re, im, 346, 347);
      MXTr3(re, im, 348, 350, 352);
      MXTr3(re, im, 349, 351, 353);
      MXRot(re, im, 351, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 353, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 348, 349);
      MXTr2(re, im, 350, 351);
      MXTr2(re, im, 352, 353);
      MXTr3(re, im, 354, 356, 358);
      MXTr3(re, im, 355, 357, 359);
      MXRot(re, im, 357, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 359, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 354, 355);
      MXTr2(re, im, 356, 357);
      MXTr2(re, im, 358, 359);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
      MXCshft(re, im, CSHFT_INDEXES_4);
      MXCshft(re, im, CSHFT_INDEXES_5);
      MXSwap(re, im, 97, 206);
      MXSwap(re, im, 153, 262);
    }

    function ApplyMixedRadixFFT_360(re, im) {
      ApplyMixedRadixFFT_360_Part1(re, im);
      ApplyMixedRadixFFT_360_Part2(re, im);
      ApplyMixedRadixFFT_360_Part3(re, im);
    }

    module.exports = {
      "ApplyMixedRadixFFT_360": ApplyMixedRadixFFT_360
    };
  },
  "lc3/math/fft-mx-480": function lc3MathFftMx480(module, require) {
    var Lc3FftMxBaseOp = require("./fft-mx-baseop");

    var MXTr2 = Lc3FftMxBaseOp.MXTr2;
    var MXTr3 = Lc3FftMxBaseOp.MXTr3;
    var MXTr4 = Lc3FftMxBaseOp.MXTr4;
    var MXTr5 = Lc3FftMxBaseOp.MXTr5;
    var MXRot = Lc3FftMxBaseOp.MXRot;
    var MXCshft = Lc3FftMxBaseOp.MXCshft;
    var CSHFT_INDEXES_0 = [1, 96, 170, 52, 252, 241, 97, 266, 127, 230, 70, 66, 138, 374, 447, 233, 358, 369, 423, 299, 469, 431, 155, 92, 242, 193, 346, 129, 422, 203, 304, 403, 293, 349, 417, 269, 415, 77, 282, 205, 40, 12, 240];
    var CSHFT_INDEXES_1 = [2, 192, 250, 49, 420, 11, 144, 404, 389, 429, 419, 461, 119, 464, 407, 221, 118, 368, 327, 219, 472, 263, 295, 85, 26, 126, 134, 446, 137, 278, 367, 231, 166, 124, 398, 381, 117, 272, 247, 217, 280, 13, 336, 171, 148, 332, 243, 289, 421, 107, 224, 406, 125, 38, 366, 135, 86, 122, 206, 136, 182, 202, 208, 328, 315, 91, 146, 140, 20, 6, 120, 14, 432, 251, 145, 44, 396, 189, 418, 365, 39, 462, 215, 88, 314, 451, 161, 100, 8, 312, 259, 457, 281, 109, 416, 173, 340, 9, 408, 317, 283, 301, 115, 80];
    var CSHFT_INDEXES_2 = [3, 288, 325, 27, 222, 214, 448, 329, 411, 149, 428, 323, 291, 157, 284, 397, 285, 37, 270, 55, 84, 386, 141, 116, 176, 172, 244, 385, 45, 36, 174, 436, 179, 460, 23, 294, 445, 41, 108, 320];
    var CSHFT_INDEXES_3 = [4, 384, 405, 29, 414, 437, 275, 79, 474, 455, 89, 410, 53, 348, 321, 99, 458, 377, 279, 463, 311, 163, 292, 253, 337, 267, 223, 310, 67, 234, 454, 449, 425, 35, 78, 378, 375, 87, 218, 376, 183, 298, 373, 351, 153, 356, 177, 268, 319, 475, 95, 74, 450, 65, 42, 204, 400, 5, 24, 390, 69, 426, 131, 158, 380, 21, 102, 200, 16, 168, 316, 187, 226, 142, 212, 256, 169, 412, 245, 25, 30, 54, 444, 401, 101, 104, 392, 261, 103, 296, 181, 106, 128, 326, 123, 302, 211, 160];
    var CSHFT_INDEXES_4 = [7, 216, 184, 394, 453, 353, 345, 33, 342, 201, 112, 248, 313, 355, 81, 98, 362, 207, 232, 262, 199, 466, 143, 308, 331, 147, 236, 190, 58, 372, 255, 73, 354, 441, 113, 344, 393, 357, 273, 343, 297, 277, 271, 151, 164, 388, 333, 339, 459, 473, 359, 465, 47, 228, 334, 435, 83, 290, 61, 114, 440, 17, 264, 391, 165, 28, 318, 379, 471, 167, 220, 22, 198, 370, 63, 306, 139, 470, 71, 162, 196, 178, 364, 399, 477, 287, 229, 430, 59, 468, 335, 75, 90, 50, 60, 18, 360, 15, 72, 258, 361, 111, 152, 260];
    var CSHFT_INDEXES_5 = [10, 48, 324, 387, 237, 286, 133, 350, 57, 276, 175, 76, 186, 130, 62, 210, 64, 402, 197, 274, 439, 467, 239, 478, 383, 309, 427, 227, 238, 382, 213, 352, 249, 409, 413, 341, 105, 32, 246, 121, 110, 56, 180];
    var CSHFT_INDEXES_6 = [19, 456, 185, 34, 438, 371, 159, 476, 191, 154, 452, 257, 265, 31, 150, 68, 330, 51, 156, 188, 322, 195, 82, 194, 442, 209, 424, 395, 93, 338, 363, 303, 307, 235, 94, 434, 443, 305, 43, 300];
    var CSHFT_INDEXES_7 = [46, 132, 254, 433, 347, 225];

    function ApplyMixedRadixFFT_480_Part1(re, im) {
      MXTr5(re, im, 0, 96, 192, 288, 384);
      MXTr5(re, im, 1, 97, 193, 289, 385);
      MXTr5(re, im, 2, 98, 194, 290, 386);
      MXTr5(re, im, 3, 99, 195, 291, 387);
      MXTr5(re, im, 4, 100, 196, 292, 388);
      MXTr5(re, im, 5, 101, 197, 293, 389);
      MXTr5(re, im, 6, 102, 198, 294, 390);
      MXTr5(re, im, 7, 103, 199, 295, 391);
      MXTr5(re, im, 8, 104, 200, 296, 392);
      MXTr5(re, im, 9, 105, 201, 297, 393);
      MXTr5(re, im, 10, 106, 202, 298, 394);
      MXTr5(re, im, 11, 107, 203, 299, 395);
      MXTr5(re, im, 12, 108, 204, 300, 396);
      MXTr5(re, im, 13, 109, 205, 301, 397);
      MXTr5(re, im, 14, 110, 206, 302, 398);
      MXTr5(re, im, 15, 111, 207, 303, 399);
      MXTr5(re, im, 16, 112, 208, 304, 400);
      MXTr5(re, im, 17, 113, 209, 305, 401);
      MXTr5(re, im, 18, 114, 210, 306, 402);
      MXTr5(re, im, 19, 115, 211, 307, 403);
      MXTr5(re, im, 20, 116, 212, 308, 404);
      MXTr5(re, im, 21, 117, 213, 309, 405);
      MXTr5(re, im, 22, 118, 214, 310, 406);
      MXTr5(re, im, 23, 119, 215, 311, 407);
      MXTr5(re, im, 24, 120, 216, 312, 408);
      MXTr5(re, im, 25, 121, 217, 313, 409);
      MXTr5(re, im, 26, 122, 218, 314, 410);
      MXTr5(re, im, 27, 123, 219, 315, 411);
      MXTr5(re, im, 28, 124, 220, 316, 412);
      MXTr5(re, im, 29, 125, 221, 317, 413);
      MXTr5(re, im, 30, 126, 222, 318, 414);
      MXTr5(re, im, 31, 127, 223, 319, 415);
      MXTr5(re, im, 32, 128, 224, 320, 416);
      MXTr5(re, im, 33, 129, 225, 321, 417);
      MXTr5(re, im, 34, 130, 226, 322, 418);
      MXTr5(re, im, 35, 131, 227, 323, 419);
      MXTr5(re, im, 36, 132, 228, 324, 420);
      MXTr5(re, im, 37, 133, 229, 325, 421);
      MXTr5(re, im, 38, 134, 230, 326, 422);
      MXTr5(re, im, 39, 135, 231, 327, 423);
      MXTr5(re, im, 40, 136, 232, 328, 424);
      MXTr5(re, im, 41, 137, 233, 329, 425);
      MXTr5(re, im, 42, 138, 234, 330, 426);
      MXTr5(re, im, 43, 139, 235, 331, 427);
      MXTr5(re, im, 44, 140, 236, 332, 428);
      MXTr5(re, im, 45, 141, 237, 333, 429);
      MXTr5(re, im, 46, 142, 238, 334, 430);
      MXTr5(re, im, 47, 143, 239, 335, 431);
      MXTr5(re, im, 48, 144, 240, 336, 432);
      MXTr5(re, im, 49, 145, 241, 337, 433);
      MXTr5(re, im, 50, 146, 242, 338, 434);
      MXTr5(re, im, 51, 147, 243, 339, 435);
      MXTr5(re, im, 52, 148, 244, 340, 436);
      MXTr5(re, im, 53, 149, 245, 341, 437);
      MXTr5(re, im, 54, 150, 246, 342, 438);
      MXTr5(re, im, 55, 151, 247, 343, 439);
      MXTr5(re, im, 56, 152, 248, 344, 440);
      MXTr5(re, im, 57, 153, 249, 345, 441);
      MXTr5(re, im, 58, 154, 250, 346, 442);
      MXTr5(re, im, 59, 155, 251, 347, 443);
      MXTr5(re, im, 60, 156, 252, 348, 444);
      MXTr5(re, im, 61, 157, 253, 349, 445);
      MXTr5(re, im, 62, 158, 254, 350, 446);
      MXTr5(re, im, 63, 159, 255, 351, 447);
      MXTr5(re, im, 64, 160, 256, 352, 448);
      MXTr5(re, im, 65, 161, 257, 353, 449);
      MXTr5(re, im, 66, 162, 258, 354, 450);
      MXTr5(re, im, 67, 163, 259, 355, 451);
      MXTr5(re, im, 68, 164, 260, 356, 452);
      MXTr5(re, im, 69, 165, 261, 357, 453);
      MXTr5(re, im, 70, 166, 262, 358, 454);
      MXTr5(re, im, 71, 167, 263, 359, 455);
      MXTr5(re, im, 72, 168, 264, 360, 456);
      MXTr5(re, im, 73, 169, 265, 361, 457);
      MXTr5(re, im, 74, 170, 266, 362, 458);
      MXTr5(re, im, 75, 171, 267, 363, 459);
      MXTr5(re, im, 76, 172, 268, 364, 460);
      MXTr5(re, im, 77, 173, 269, 365, 461);
      MXTr5(re, im, 78, 174, 270, 366, 462);
      MXTr5(re, im, 79, 175, 271, 367, 463);
      MXTr5(re, im, 80, 176, 272, 368, 464);
      MXTr5(re, im, 81, 177, 273, 369, 465);
      MXTr5(re, im, 82, 178, 274, 370, 466);
      MXTr5(re, im, 83, 179, 275, 371, 467);
      MXTr5(re, im, 84, 180, 276, 372, 468);
      MXTr5(re, im, 85, 181, 277, 373, 469);
      MXTr5(re, im, 86, 182, 278, 374, 470);
      MXTr5(re, im, 87, 183, 279, 375, 471);
      MXTr5(re, im, 88, 184, 280, 376, 472);
      MXTr5(re, im, 89, 185, 281, 377, 473);
      MXTr5(re, im, 90, 186, 282, 378, 474);
      MXTr5(re, im, 91, 187, 283, 379, 475);
      MXTr5(re, im, 92, 188, 284, 380, 476);
      MXTr5(re, im, 93, 189, 285, 381, 477);
      MXTr5(re, im, 94, 190, 286, 382, 478);
      MXTr5(re, im, 95, 191, 287, 383, 479);
      MXRot(re, im, 97, 0.999914327574007, -0.01308959557134444);
      MXRot(re, im, 98, 0.9996573249755573, -0.02617694830787315);
      MXRot(re, im, 99, 0.9992290362407229, -0.03925981575906861);
      MXRot(re, im, 100, 0.9986295347545738, -0.05233595624294383);
      MXRot(re, im, 101, 0.9978589232386035, -0.06540312923014306);
      MXRot(re, im, 102, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 103, 0.9958049275746618, -0.09150161866340237);
      MXRot(re, im, 104, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 105, 0.9930684569549263, -0.11753739745783764);
      MXRot(re, im, 106, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 107, 0.9896513868196702, -0.1434926219911793);
      MXRot(re, im, 108, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 109, 0.9855560590580777, -0.16934950384902459);
      MXRot(re, im, 110, 0.9832549075639546, -0.18223552549214744);
      MXRot(re, im, 111, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 112, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 113, 0.9753423205085127, -0.22069743502150108);
      MXRot(re, im, 114, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 115, 0.9692309097067544, -0.24615329302899303);
      MXRot(re, im, 116, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 117, 0.9624552364536473, -0.27144044986507426);
      MXRot(re, im, 118, 0.958819734868193, -0.2840153447039226);
      MXRot(re, im, 119, 0.9550199444571866, -0.29654157497557093);
      MXRot(re, im, 120, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 121, 0.9469301294951057, -0.32143946530316153);
      MXRot(re, im, 122, 0.9426414910921784, -0.3338068592337709);
      MXRot(re, im, 123, 0.9381913359224842, -0.34611705707749296);
      MXRot(re, im, 124, 0.9335804264972017, -0.3583679495453002);
      MXRot(re, im, 125, 0.9288095528719242, -0.3705574375098362);
      MXRot(re, im, 126, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 127, 0.9187912101488983, -0.3947438563842672);
      MXRot(re, im, 128, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 129, 0.9081431738250813, -0.4186597375374281);
      MXRot(re, im, 130, 0.9025852843498606, -0.4305110968082951);
      MXRot(re, im, 131, 0.8968727415326884, -0.44228869021900125);
      MXRot(re, im, 132, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 133, 0.8849876374630419, -0.46561452032511136);
      MXRot(re, im, 134, 0.8788171126619654, -0.4771587602596084);
      MXRot(re, im, 135, 0.8724960070727972, -0.4886212414969549);
      MXRot(re, im, 136, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 137, 0.8594064115014527, -0.511293086077052);
      MXRot(re, im, 138, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 139, 0.8457278217039733, -0.5336145159156115);
      MXRot(re, im, 140, 0.838670567945424, -0.544639035015027);
      MXRot(re, im, 141, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 142, 0.8241261886220157, -0.5664062369248328);
      MXRot(re, im, 143, 0.816641555161679, -0.5771451900372335);
      MXRot(re, im, 144, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 145, 0.8012538126910607, -0.598324600570659);
      MXRot(re, im, 146, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 147, 0.785316930880745, -0.619093949309834);
      MXRot(re, im, 148, 0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 149, 0.7688418320734596, -0.6394390019805847);
      MXRot(re, im, 150, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 151, 0.7518398074789774, -0.6593458151000688);
      MXRot(re, im, 152, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 153, 0.7343225094356856, -0.6788007455329417);
      MXRot(re, im, 154, 0.7253743710122876, -0.6883545756937539);
      MXRot(re, im, 155, 0.7163019434246544, -0.6977904598416801);
      MXRot(re, im, 156, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 157, 0.6977904598416802, -0.7163019434246543);
      MXRot(re, im, 158, 0.688354575693754, -0.7253743710122875);
      MXRot(re, im, 159, 0.6788007455329418, -0.7343225094356856);
      MXRot(re, im, 160, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 161, 0.659345815100069, -0.7518398074789773);
      MXRot(re, im, 162, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 163, 0.6394390019805848, -0.7688418320734595);
      MXRot(re, im, 164, 0.6293203910498375, -0.7771459614569708);
      MXRot(re, im, 165, 0.619093949309834, -0.785316930880745);
      MXRot(re, im, 166, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 167, 0.5983246005706592, -0.8012538126910606);
      MXRot(re, im, 168, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 169, 0.5771451900372337, -0.8166415551616789);
      MXRot(re, im, 170, 0.5664062369248329, -0.8241261886220156);
      MXRot(re, im, 171, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 172, 0.5446390350150272, -0.8386705679454239);
      MXRot(re, im, 173, 0.5336145159156116, -0.8457278217039732);
      MXRot(re, im, 174, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 175, 0.5112930860770523, -0.8594064115014526);
      MXRot(re, im, 176, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 177, 0.48862124149695496, -0.8724960070727971);
      MXRot(re, im, 178, 0.47715876025960857, -0.8788171126619653);
      MXRot(re, im, 179, 0.4656145203251115, -0.8849876374630418);
      MXRot(re, im, 180, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 181, 0.44228869021900147, -0.8968727415326883);
      MXRot(re, im, 182, 0.43051109680829525, -0.9025852843498605);
      MXRot(re, im, 183, 0.41865973753742813, -0.9081431738250813);
      MXRot(re, im, 184, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 185, 0.39474385638426734, -0.9187912101488982);
      MXRot(re, im, 186, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 187, 0.3705574375098364, -0.9288095528719241);
      MXRot(re, im, 188, 0.3583679495453004, -0.9335804264972017);
      MXRot(re, im, 189, 0.346117057077493, -0.9381913359224842);
      MXRot(re, im, 190, 0.3338068592337711, -0.9426414910921783);
      MXRot(re, im, 191, 0.3214394653031617, -0.9469301294951056);
      MXRot(re, im, 193, 0.9996573249755573, -0.02617694830787315);
      MXRot(re, im, 194, 0.9986295347545738, -0.05233595624294383);
      MXRot(re, im, 195, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 196, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 197, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 198, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 199, 0.9832549075639546, -0.18223552549214744);
      MXRot(re, im, 200, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 201, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 202, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 203, 0.958819734868193, -0.2840153447039226);
      MXRot(re, im, 204, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 205, 0.9426414910921784, -0.3338068592337709);
      MXRot(re, im, 206, 0.9335804264972017, -0.3583679495453002);
      MXRot(re, im, 207, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 208, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 209, 0.9025852843498606, -0.4305110968082951);
      MXRot(re, im, 210, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 211, 0.8788171126619654, -0.4771587602596084);
      MXRot(re, im, 212, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 213, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 214, 0.838670567945424, -0.544639035015027);
      MXRot(re, im, 215, 0.8241261886220157, -0.5664062369248328);
      MXRot(re, im, 216, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 217, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 218, 0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 219, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 220, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 221, 0.7253743710122876, -0.6883545756937539);
      MXRot(re, im, 222, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 223, 0.688354575693754, -0.7253743710122875);
      MXRot(re, im, 224, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 225, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 226, 0.6293203910498375, -0.7771459614569708);
      MXRot(re, im, 227, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 228, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 229, 0.5664062369248329, -0.8241261886220156);
      MXRot(re, im, 230, 0.5446390350150272, -0.8386705679454239);
      MXRot(re, im, 231, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 232, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 233, 0.47715876025960857, -0.8788171126619653);
      MXRot(re, im, 234, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 235, 0.43051109680829525, -0.9025852843498605);
      MXRot(re, im, 236, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 237, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 238, 0.3583679495453004, -0.9335804264972017);
      MXRot(re, im, 239, 0.3338068592337711, -0.9426414910921783);
      MXRot(re, im, 240, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 241, 0.28401534470392276, -0.958819734868193);
      MXRot(re, im, 242, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 243, 0.23344536385590547, -0.9723699203976766);
      MXRot(re, im, 244, 0.20791169081775945, -0.9781476007338056);
      MXRot(re, im, 245, 0.18223552549214767, -0.9832549075639545);
      MXRot(re, im, 246, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 247, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 248, 0.10452846326765368, -0.9945218953682733);
      MXRot(re, im, 249, 0.078459095727845, -0.996917333733128);
      MXRot(re, im, 250, 0.052335956242943966, -0.9986295347545738);
      MXRot(re, im, 251, 0.02617694830787336, -0.9996573249755573);
      MXRot(re, im, 252, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 253, -0.026176948307873017, -0.9996573249755573);
      MXRot(re, im, 254, -0.05233595624294362, -0.9986295347545738);
      MXRot(re, im, 255, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 256, -0.10452846326765333, -0.9945218953682734);
      MXRot(re, im, 257, -0.13052619222005138, -0.9914448613738105);
      MXRot(re, im, 258, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 259, -0.1822355254921473, -0.9832549075639546);
      MXRot(re, im, 260, -0.20791169081775912, -0.9781476007338057);
      MXRot(re, im, 261, -0.23344536385590534, -0.9723699203976767);
      MXRot(re, im, 262, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 263, -0.2840153447039224, -0.9588197348681932);
      MXRot(re, im, 264, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 265, -0.3338068592337708, -0.9426414910921784);
      MXRot(re, im, 266, -0.35836794954530005, -0.9335804264972019);
      MXRot(re, im, 267, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 268, -0.40673664307580004, -0.913545457642601);
      MXRot(re, im, 269, -0.4305110968082949, -0.9025852843498607);
      MXRot(re, im, 270, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 271, -0.4771587602596081, -0.8788171126619656);
      MXRot(re, im, 272, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 273, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 274, -0.5446390350150268, -0.8386705679454243);
      MXRot(re, im, 275, -0.5664062369248326, -0.8241261886220158);
      MXRot(re, im, 276, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 277, -0.6087614290087203, -0.7933533402912354);
      MXRot(re, im, 278, -0.6293203910498373, -0.777145961456971);
      MXRot(re, im, 279, -0.6494480483301835, -0.760405965600031);
      MXRot(re, im, 280, -0.6691306063588579, -0.7431448254773945);
      MXRot(re, im, 281, -0.6883545756937538, -0.7253743710122879);
      MXRot(re, im, 282, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 283, -0.7253743710122874, -0.6883545756937542);
      MXRot(re, im, 284, -0.743144825477394, -0.6691306063588583);
      MXRot(re, im, 285, -0.7604059656000309, -0.6494480483301838);
      MXRot(re, im, 286, -0.7771459614569707, -0.6293203910498377);
      MXRot(re, im, 287, -0.793353340291235, -0.6087614290087209);
      MXRot(re, im, 289, 0.9992290362407229, -0.03925981575906861);
      MXRot(re, im, 290, 0.996917333733128, -0.07845909572784494);
      MXRot(re, im, 291, 0.9930684569549263, -0.11753739745783764);
      MXRot(re, im, 292, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 293, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 294, 0.9723699203976766, -0.2334453638559054);
      MXRot(re, im, 295, 0.9624552364536473, -0.27144044986507426);
      MXRot(re, im, 296, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 297, 0.9381913359224842, -0.34611705707749296);
      MXRot(re, im, 298, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 299, 0.9081431738250813, -0.4186597375374281);
      MXRot(re, im, 300, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 301, 0.8724960070727972, -0.4886212414969549);
      MXRot(re, im, 302, 0.8526401643540922, -0.5224985647159488);
      MXRot(re, im, 303, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 304, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 305, 0.785316930880745, -0.619093949309834);
      MXRot(re, im, 306, 0.7604059656000309, -0.6494480483301837);
      MXRot(re, im, 307, 0.7343225094356856, -0.6788007455329417);
      MXRot(re, im, 308, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 309, 0.6788007455329418, -0.7343225094356856);
      MXRot(re, im, 310, 0.6494480483301837, -0.7604059656000309);
      MXRot(re, im, 311, 0.619093949309834, -0.785316930880745);
      MXRot(re, im, 312, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 313, 0.5555702330196023, -0.8314696123025452);
      MXRot(re, im, 314, 0.5224985647159489, -0.8526401643540922);
      MXRot(re, im, 315, 0.48862124149695496, -0.8724960070727971);
      MXRot(re, im, 316, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 317, 0.41865973753742813, -0.9081431738250813);
      MXRot(re, im, 318, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 319, 0.346117057077493, -0.9381913359224842);
      MXRot(re, im, 320, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 321, 0.2714404498650743, -0.9624552364536473);
      MXRot(re, im, 322, 0.23344536385590547, -0.9723699203976766);
      MXRot(re, im, 323, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 324, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 325, 0.1175373974578377, -0.9930684569549263);
      MXRot(re, im, 326, 0.078459095727845, -0.996917333733128);
      MXRot(re, im, 327, 0.039259815759068666, -0.9992290362407229);
      MXRot(re, im, 328, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 329, -0.03925981575906855, -0.9992290362407229);
      MXRot(re, im, 330, -0.07845909572784487, -0.996917333733128);
      MXRot(re, im, 331, -0.11753739745783758, -0.9930684569549263);
      MXRot(re, im, 332, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 333, -0.1950903220161282, -0.9807852804032304);
      MXRot(re, im, 334, -0.23344536385590534, -0.9723699203976767);
      MXRot(re, im, 335, -0.2714404498650742, -0.9624552364536473);
      MXRot(re, im, 336, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 337, -0.3461170570774929, -0.9381913359224842);
      MXRot(re, im, 338, -0.3826834323650897, -0.9238795325112867);
      MXRot(re, im, 339, -0.4186597375374278, -0.9081431738250815);
      MXRot(re, im, 340, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 341, -0.4886212414969547, -0.8724960070727973);
      MXRot(re, im, 342, -0.5224985647159488, -0.8526401643540923);
      MXRot(re, im, 343, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 344, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 345, -0.6190939493098337, -0.7853169308807452);
      MXRot(re, im, 346, -0.6494480483301835, -0.760405965600031);
      MXRot(re, im, 347, -0.6788007455329416, -0.7343225094356858);
      MXRot(re, im, 348, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 349, -0.7343225094356853, -0.678800745532942);
      MXRot(re, im, 350, -0.7604059656000309, -0.6494480483301838);
      MXRot(re, im, 351, -0.7853169308807447, -0.6190939493098342);
      MXRot(re, im, 352, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 353, -0.831469612302545, -0.5555702330196025);
      MXRot(re, im, 354, -0.8526401643540922, -0.5224985647159489);
      MXRot(re, im, 355, -0.872496007072797, -0.48862124149695524);
      MXRot(re, im, 356, -0.8910065241883678, -0.45399049973954686);
      MXRot(re, im, 357, -0.9081431738250811, -0.4186597375374284);
      MXRot(re, im, 358, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 359, -0.938191335922484, -0.3461170570774933);
      MXRot(re, im, 360, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 361, -0.9624552364536472, -0.2714404498650746);
      MXRot(re, im, 362, -0.9723699203976766, -0.23344536385590553);
      MXRot(re, im, 363, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 364, -0.9876883405951377, -0.15643446504023098);
      MXRot(re, im, 365, -0.9930684569549263, -0.11753739745783798);
      MXRot(re, im, 366, -0.996917333733128, -0.07845909572784507);
      MXRot(re, im, 367, -0.9992290362407229, -0.03925981575906895);
      MXRot(re, im, 368, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 369, -0.9992290362407229, 0.03925981575906826);
      MXRot(re, im, 370, -0.996917333733128, 0.07845909572784482);
      MXRot(re, im, 371, -0.9930684569549263, 0.1175373974578373);
      MXRot(re, im, 372, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 373, -0.9807852804032305, 0.19509032201612792);
      MXRot(re, im, 374, -0.9723699203976767, 0.23344536385590528);
      MXRot(re, im, 375, -0.9624552364536474, 0.27144044986507393);
      MXRot(re, im, 376, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 377, -0.9381913359224843, 0.34611705707749263);
      MXRot(re, im, 378, -0.9238795325112868, 0.38268343236508967);
      MXRot(re, im, 379, -0.9081431738250815, 0.41865973753742775);
      MXRot(re, im, 380, -0.8910065241883679, 0.4539904997395467);
      MXRot(re, im, 381, -0.8724960070727973, 0.48862124149695463);
      MXRot(re, im, 382, -0.8526401643540923, 0.5224985647159487);
      MXRot(re, im, 383, -0.8314696123025455, 0.555570233019602);
      MXRot(re, im, 385, 0.9986295347545738, -0.05233595624294383);
      MXRot(re, im, 386, 0.9945218953682733, -0.10452846326765346);
      MXRot(re, im, 387, 0.9876883405951378, -0.15643446504023087);
      MXRot(re, im, 388, 0.9781476007338057, -0.20791169081775931);
      MXRot(re, im, 389, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 390, 0.9510565162951535, -0.3090169943749474);
      MXRot(re, im, 391, 0.9335804264972017, -0.3583679495453002);
      MXRot(re, im, 392, 0.9135454576426009, -0.40673664307580015);
      MXRot(re, im, 393, 0.8910065241883679, -0.45399049973954675);
      MXRot(re, im, 394, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 395, 0.838670567945424, -0.544639035015027);
      MXRot(re, im, 396, 0.8090169943749475, -0.5877852522924731);
      MXRot(re, im, 397, 0.7771459614569709, -0.6293203910498374);
      MXRot(re, im, 398, 0.7431448254773944, -0.6691306063588581);
      MXRot(re, im, 399, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 400, 0.6691306063588582, -0.7431448254773941);
      MXRot(re, im, 401, 0.6293203910498375, -0.7771459614569708);
      MXRot(re, im, 402, 0.5877852522924731, -0.8090169943749475);
      MXRot(re, im, 403, 0.5446390350150272, -0.8386705679454239);
      MXRot(re, im, 404, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 405, 0.4539904997395468, -0.8910065241883678);
      MXRot(re, im, 406, 0.4067366430758004, -0.9135454576426009);
      MXRot(re, im, 407, 0.3583679495453004, -0.9335804264972017);
      MXRot(re, im, 408, 0.30901699437494745, -0.9510565162951535);
      MXRot(re, im, 409, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 410, 0.20791169081775945, -0.9781476007338056);
      MXRot(re, im, 411, 0.15643446504023092, -0.9876883405951378);
      MXRot(re, im, 412, 0.10452846326765368, -0.9945218953682733);
      MXRot(re, im, 413, 0.052335956242943966, -0.9986295347545738);
      MXRot(re, im, 414, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 415, -0.05233595624294362, -0.9986295347545738);
      MXRot(re, im, 416, -0.10452846326765333, -0.9945218953682734);
      MXRot(re, im, 417, -0.1564344650402308, -0.9876883405951378);
      MXRot(re, im, 418, -0.20791169081775912, -0.9781476007338057);
      MXRot(re, im, 419, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 420, -0.30901699437494734, -0.9510565162951536);
      MXRot(re, im, 421, -0.35836794954530005, -0.9335804264972019);
      MXRot(re, im, 422, -0.40673664307580004, -0.913545457642601);
      MXRot(re, im, 423, -0.4539904997395467, -0.8910065241883679);
      MXRot(re, im, 424, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 425, -0.5446390350150268, -0.8386705679454243);
      MXRot(re, im, 426, -0.587785252292473, -0.8090169943749475);
      MXRot(re, im, 427, -0.6293203910498373, -0.777145961456971);
      MXRot(re, im, 428, -0.6691306063588579, -0.7431448254773945);
      MXRot(re, im, 429, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 430, -0.743144825477394, -0.6691306063588583);
      MXRot(re, im, 431, -0.7771459614569707, -0.6293203910498377);
      MXRot(re, im, 432, -0.8090169943749473, -0.5877852522924732);
      MXRot(re, im, 433, -0.8386705679454239, -0.5446390350150273);
      MXRot(re, im, 434, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 435, -0.8910065241883678, -0.45399049973954686);
      MXRot(re, im, 436, -0.9135454576426008, -0.40673664307580043);
      MXRot(re, im, 437, -0.9335804264972016, -0.35836794954530066);
      MXRot(re, im, 438, -0.9510565162951535, -0.3090169943749475);
      MXRot(re, im, 439, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 440, -0.9781476007338056, -0.20791169081775973);
      MXRot(re, im, 441, -0.9876883405951377, -0.15643446504023098);
      MXRot(re, im, 442, -0.9945218953682733, -0.10452846326765373);
      MXRot(re, im, 443, -0.9986295347545738, -0.05233595624294425);
      MXRot(re, im, 444, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 445, -0.9986295347545738, 0.052335956242943564);
      MXRot(re, im, 446, -0.9945218953682734, 0.10452846326765305);
      MXRot(re, im, 447, -0.9876883405951378, 0.15643446504023073);
      MXRot(re, im, 448, -0.9781476007338057, 0.20791169081775907);
      MXRot(re, im, 449, -0.9659258262890684, 0.25881904510252035);
      MXRot(re, im, 450, -0.9510565162951536, 0.3090169943749473);
      MXRot(re, im, 451, -0.9335804264972019, 0.3583679495453);
      MXRot(re, im, 452, -0.9135454576426011, 0.4067366430757998);
      MXRot(re, im, 453, -0.8910065241883679, 0.4539904997395467);
      MXRot(re, im, 454, -0.8660254037844388, 0.4999999999999997);
      MXRot(re, im, 455, -0.8386705679454243, 0.5446390350150268);
      MXRot(re, im, 456, -0.8090169943749476, 0.587785252292473);
      MXRot(re, im, 457, -0.777145961456971, 0.6293203910498372);
      MXRot(re, im, 458, -0.7431448254773946, 0.6691306063588579);
      MXRot(re, im, 459, -0.7071067811865477, 0.7071067811865475);
      MXRot(re, im, 460, -0.6691306063588585, 0.743144825477394);
      MXRot(re, im, 461, -0.6293203910498378, 0.7771459614569706);
      MXRot(re, im, 462, -0.5877852522924732, 0.8090169943749473);
      MXRot(re, im, 463, -0.5446390350150278, 0.8386705679454236);
      MXRot(re, im, 464, -0.5000000000000004, 0.8660254037844384);
      MXRot(re, im, 465, -0.4539904997395469, 0.8910065241883678);
      MXRot(re, im, 466, -0.4067366430758009, 0.9135454576426005);
      MXRot(re, im, 467, -0.3583679495453007, 0.9335804264972016);
      MXRot(re, im, 468, -0.30901699437494756, 0.9510565162951535);
      MXRot(re, im, 469, -0.2588190451025215, 0.9659258262890681);
      MXRot(re, im, 470, -0.2079116908177598, 0.9781476007338056);
      MXRot(re, im, 471, -0.15643446504023104, 0.9876883405951377);
      MXRot(re, im, 472, -0.10452846326765423, 0.9945218953682733);
      MXRot(re, im, 473, -0.052335956242944306, 0.9986295347545738);
      MXRot(re, im, 474, -1.8369701987210297e-16, 1.0);
      MXRot(re, im, 475, 0.05233595624294306, 0.9986295347545739);
      MXRot(re, im, 476, 0.10452846326765299, 0.9945218953682734);
      MXRot(re, im, 477, 0.15643446504023067, 0.9876883405951378);
      MXRot(re, im, 478, 0.20791169081775857, 0.9781476007338058);
      MXRot(re, im, 479, 0.2588190451025203, 0.9659258262890684);
      MXTr4(re, im, 0, 24, 48, 72);
      MXTr4(re, im, 1, 25, 49, 73);
      MXTr4(re, im, 2, 26, 50, 74);
      MXTr4(re, im, 3, 27, 51, 75);
      MXTr4(re, im, 4, 28, 52, 76);
      MXTr4(re, im, 5, 29, 53, 77);
      MXTr4(re, im, 6, 30, 54, 78);
      MXTr4(re, im, 7, 31, 55, 79);
      MXTr4(re, im, 8, 32, 56, 80);
      MXTr4(re, im, 9, 33, 57, 81);
      MXTr4(re, im, 10, 34, 58, 82);
      MXTr4(re, im, 11, 35, 59, 83);
      MXTr4(re, im, 12, 36, 60, 84);
      MXTr4(re, im, 13, 37, 61, 85);
      MXTr4(re, im, 14, 38, 62, 86);
      MXTr4(re, im, 15, 39, 63, 87);
      MXTr4(re, im, 16, 40, 64, 88);
      MXTr4(re, im, 17, 41, 65, 89);
      MXTr4(re, im, 18, 42, 66, 90);
      MXTr4(re, im, 19, 43, 67, 91);
      MXTr4(re, im, 20, 44, 68, 92);
      MXTr4(re, im, 21, 45, 69, 93);
      MXTr4(re, im, 22, 46, 70, 94);
      MXTr4(re, im, 23, 47, 71, 95);
      MXRot(re, im, 25, 0.9978589232386035, -0.06540312923014306);
      MXRot(re, im, 26, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 27, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 28, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 29, 0.9469301294951057, -0.32143946530316153);
      MXRot(re, im, 30, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 31, 0.8968727415326884, -0.44228869021900125);
      MXRot(re, im, 32, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 33, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 34, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 35, 0.7518398074789774, -0.6593458151000688);
      MXRot(re, im, 36, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 37, 0.659345815100069, -0.7518398074789773);
      MXRot(re, im, 38, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 39, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 40, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 41, 0.44228869021900147, -0.8968727415326883);
      MXRot(re, im, 42, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 43, 0.3214394653031617, -0.9469301294951056);
      MXRot(re, im, 44, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 45, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 46, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 47, 0.06540312923014327, -0.9978589232386035);
      MXRot(re, im, 49, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 50, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 51, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 52, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 53, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 54, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 55, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 56, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 57, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 58, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 59, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 60, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 61, -0.13052619222005138, -0.9914448613738105);
      MXRot(re, im, 62, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 63, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 64, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 65, -0.6087614290087203, -0.7933533402912354);
      MXRot(re, im, 66, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 67, -0.793353340291235, -0.6087614290087209);
      MXRot(re, im, 68, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 69, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 70, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 71, -0.9914448613738104, -0.130526192220052);
      MXRot(re, im, 73, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 74, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 75, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 76, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 77, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 78, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 79, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 80, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 81, -0.19509032201612797, -0.9807852804032305);
      MXRot(re, im, 82, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 83, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 84, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 85, -0.831469612302545, -0.5555702330196025);
      MXRot(re, im, 86, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 87, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 88, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 89, -0.9807852804032305, 0.19509032201612792);
      MXRot(re, im, 90, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 91, -0.8314696123025455, 0.555570233019602);
      MXRot(re, im, 92, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 93, -0.555570233019603, 0.8314696123025448);
      MXRot(re, im, 94, -0.38268343236509034, 0.9238795325112865);
      MXRot(re, im, 95, -0.19509032201612866, 0.9807852804032303);
      MXTr4(re, im, 0, 6, 12, 18);
      MXTr4(re, im, 1, 7, 13, 19);
      MXTr4(re, im, 2, 8, 14, 20);
      MXTr4(re, im, 3, 9, 15, 21);
      MXTr4(re, im, 4, 10, 16, 22);
      MXTr4(re, im, 5, 11, 17, 23);
      MXRot(re, im, 7, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 8, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 9, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 10, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 11, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 13, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 14, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 15, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 16, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 17, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 19, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 20, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 21, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 22, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 23, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 0, 2, 4);
      MXTr3(re, im, 1, 3, 5);
      MXRot(re, im, 3, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 5, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 0, 1);
      MXTr2(re, im, 2, 3);
      MXTr2(re, im, 4, 5);
      MXTr3(re, im, 6, 8, 10);
      MXTr3(re, im, 7, 9, 11);
      MXRot(re, im, 9, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 11, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 6, 7);
      MXTr2(re, im, 8, 9);
      MXTr2(re, im, 10, 11);
      MXTr3(re, im, 12, 14, 16);
      MXTr3(re, im, 13, 15, 17);
      MXRot(re, im, 15, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 17, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 12, 13);
      MXTr2(re, im, 14, 15);
      MXTr2(re, im, 16, 17);
      MXTr3(re, im, 18, 20, 22);
      MXTr3(re, im, 19, 21, 23);
      MXRot(re, im, 21, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 23, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 18, 19);
      MXTr2(re, im, 20, 21);
      MXTr2(re, im, 22, 23);
      MXTr4(re, im, 24, 30, 36, 42);
      MXTr4(re, im, 25, 31, 37, 43);
      MXTr4(re, im, 26, 32, 38, 44);
      MXTr4(re, im, 27, 33, 39, 45);
      MXTr4(re, im, 28, 34, 40, 46);
      MXTr4(re, im, 29, 35, 41, 47);
      MXRot(re, im, 31, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 32, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 33, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 34, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 35, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 37, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 38, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 39, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 40, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 41, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 43, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 44, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 45, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 46, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 47, -0.7071067811865479, 0.7071067811865471);
    }

    function ApplyMixedRadixFFT_480_Part2(re, im) {
      MXTr3(re, im, 24, 26, 28);
      MXTr3(re, im, 25, 27, 29);
      MXRot(re, im, 27, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 29, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 24, 25);
      MXTr2(re, im, 26, 27);
      MXTr2(re, im, 28, 29);
      MXTr3(re, im, 30, 32, 34);
      MXTr3(re, im, 31, 33, 35);
      MXRot(re, im, 33, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 35, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 30, 31);
      MXTr2(re, im, 32, 33);
      MXTr2(re, im, 34, 35);
      MXTr3(re, im, 36, 38, 40);
      MXTr3(re, im, 37, 39, 41);
      MXRot(re, im, 39, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 41, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 36, 37);
      MXTr2(re, im, 38, 39);
      MXTr2(re, im, 40, 41);
      MXTr3(re, im, 42, 44, 46);
      MXTr3(re, im, 43, 45, 47);
      MXRot(re, im, 45, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 47, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 42, 43);
      MXTr2(re, im, 44, 45);
      MXTr2(re, im, 46, 47);
      MXTr4(re, im, 48, 54, 60, 66);
      MXTr4(re, im, 49, 55, 61, 67);
      MXTr4(re, im, 50, 56, 62, 68);
      MXTr4(re, im, 51, 57, 63, 69);
      MXTr4(re, im, 52, 58, 64, 70);
      MXTr4(re, im, 53, 59, 65, 71);
      MXRot(re, im, 55, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 56, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 57, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 58, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 59, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 61, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 62, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 63, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 64, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 65, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 67, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 68, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 69, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 70, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 71, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 48, 50, 52);
      MXTr3(re, im, 49, 51, 53);
      MXRot(re, im, 51, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 53, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 48, 49);
      MXTr2(re, im, 50, 51);
      MXTr2(re, im, 52, 53);
      MXTr3(re, im, 54, 56, 58);
      MXTr3(re, im, 55, 57, 59);
      MXRot(re, im, 57, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 59, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 54, 55);
      MXTr2(re, im, 56, 57);
      MXTr2(re, im, 58, 59);
      MXTr3(re, im, 60, 62, 64);
      MXTr3(re, im, 61, 63, 65);
      MXRot(re, im, 63, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 65, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 60, 61);
      MXTr2(re, im, 62, 63);
      MXTr2(re, im, 64, 65);
      MXTr3(re, im, 66, 68, 70);
      MXTr3(re, im, 67, 69, 71);
      MXRot(re, im, 69, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 71, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 66, 67);
      MXTr2(re, im, 68, 69);
      MXTr2(re, im, 70, 71);
      MXTr4(re, im, 72, 78, 84, 90);
      MXTr4(re, im, 73, 79, 85, 91);
      MXTr4(re, im, 74, 80, 86, 92);
      MXTr4(re, im, 75, 81, 87, 93);
      MXTr4(re, im, 76, 82, 88, 94);
      MXTr4(re, im, 77, 83, 89, 95);
      MXRot(re, im, 79, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 80, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 81, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 82, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 83, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 85, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 86, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 87, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 88, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 89, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 91, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 92, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 93, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 94, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 95, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 72, 74, 76);
      MXTr3(re, im, 73, 75, 77);
      MXRot(re, im, 75, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 77, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 72, 73);
      MXTr2(re, im, 74, 75);
      MXTr2(re, im, 76, 77);
      MXTr3(re, im, 78, 80, 82);
      MXTr3(re, im, 79, 81, 83);
      MXRot(re, im, 81, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 83, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 78, 79);
      MXTr2(re, im, 80, 81);
      MXTr2(re, im, 82, 83);
      MXTr3(re, im, 84, 86, 88);
      MXTr3(re, im, 85, 87, 89);
      MXRot(re, im, 87, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 89, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 84, 85);
      MXTr2(re, im, 86, 87);
      MXTr2(re, im, 88, 89);
      MXTr3(re, im, 90, 92, 94);
      MXTr3(re, im, 91, 93, 95);
      MXRot(re, im, 93, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 95, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 90, 91);
      MXTr2(re, im, 92, 93);
      MXTr2(re, im, 94, 95);
      MXTr4(re, im, 96, 120, 144, 168);
      MXTr4(re, im, 97, 121, 145, 169);
      MXTr4(re, im, 98, 122, 146, 170);
      MXTr4(re, im, 99, 123, 147, 171);
      MXTr4(re, im, 100, 124, 148, 172);
      MXTr4(re, im, 101, 125, 149, 173);
      MXTr4(re, im, 102, 126, 150, 174);
      MXTr4(re, im, 103, 127, 151, 175);
      MXTr4(re, im, 104, 128, 152, 176);
      MXTr4(re, im, 105, 129, 153, 177);
      MXTr4(re, im, 106, 130, 154, 178);
      MXTr4(re, im, 107, 131, 155, 179);
      MXTr4(re, im, 108, 132, 156, 180);
      MXTr4(re, im, 109, 133, 157, 181);
      MXTr4(re, im, 110, 134, 158, 182);
      MXTr4(re, im, 111, 135, 159, 183);
      MXTr4(re, im, 112, 136, 160, 184);
      MXTr4(re, im, 113, 137, 161, 185);
      MXTr4(re, im, 114, 138, 162, 186);
      MXTr4(re, im, 115, 139, 163, 187);
      MXTr4(re, im, 116, 140, 164, 188);
      MXTr4(re, im, 117, 141, 165, 189);
      MXTr4(re, im, 118, 142, 166, 190);
      MXTr4(re, im, 119, 143, 167, 191);
      MXRot(re, im, 121, 0.9978589232386035, -0.06540312923014306);
      MXRot(re, im, 122, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 123, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 124, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 125, 0.9469301294951057, -0.32143946530316153);
      MXRot(re, im, 126, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 127, 0.8968727415326884, -0.44228869021900125);
      MXRot(re, im, 128, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 129, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 130, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 131, 0.7518398074789774, -0.6593458151000688);
      MXRot(re, im, 132, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 133, 0.659345815100069, -0.7518398074789773);
      MXRot(re, im, 134, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 135, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 136, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 137, 0.44228869021900147, -0.8968727415326883);
      MXRot(re, im, 138, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 139, 0.3214394653031617, -0.9469301294951056);
      MXRot(re, im, 140, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 141, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 142, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 143, 0.06540312923014327, -0.9978589232386035);
      MXRot(re, im, 145, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 146, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 147, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 148, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 149, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 150, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 151, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 152, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 153, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 154, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 155, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 156, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 157, -0.13052619222005138, -0.9914448613738105);
      MXRot(re, im, 158, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 159, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 160, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 161, -0.6087614290087203, -0.7933533402912354);
      MXRot(re, im, 162, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 163, -0.793353340291235, -0.6087614290087209);
      MXRot(re, im, 164, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 165, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 166, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 167, -0.9914448613738104, -0.130526192220052);
      MXRot(re, im, 169, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 170, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 171, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 172, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 173, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 174, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 175, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 176, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 177, -0.19509032201612797, -0.9807852804032305);
      MXRot(re, im, 178, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 179, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 180, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 181, -0.831469612302545, -0.5555702330196025);
      MXRot(re, im, 182, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 183, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 184, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 185, -0.9807852804032305, 0.19509032201612792);
      MXRot(re, im, 186, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 187, -0.8314696123025455, 0.555570233019602);
      MXRot(re, im, 188, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 189, -0.555570233019603, 0.8314696123025448);
      MXRot(re, im, 190, -0.38268343236509034, 0.9238795325112865);
      MXRot(re, im, 191, -0.19509032201612866, 0.9807852804032303);
      MXTr4(re, im, 96, 102, 108, 114);
      MXTr4(re, im, 97, 103, 109, 115);
      MXTr4(re, im, 98, 104, 110, 116);
      MXTr4(re, im, 99, 105, 111, 117);
      MXTr4(re, im, 100, 106, 112, 118);
      MXTr4(re, im, 101, 107, 113, 119);
      MXRot(re, im, 103, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 104, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 105, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 106, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 107, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 109, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 110, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 111, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 112, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 113, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 115, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 116, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 117, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 118, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 119, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 96, 98, 100);
      MXTr3(re, im, 97, 99, 101);
      MXRot(re, im, 99, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 101, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 96, 97);
      MXTr2(re, im, 98, 99);
      MXTr2(re, im, 100, 101);
      MXTr3(re, im, 102, 104, 106);
      MXTr3(re, im, 103, 105, 107);
      MXRot(re, im, 105, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 107, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 102, 103);
      MXTr2(re, im, 104, 105);
      MXTr2(re, im, 106, 107);
      MXTr3(re, im, 108, 110, 112);
      MXTr3(re, im, 109, 111, 113);
      MXRot(re, im, 111, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 113, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 108, 109);
      MXTr2(re, im, 110, 111);
      MXTr2(re, im, 112, 113);
      MXTr3(re, im, 114, 116, 118);
      MXTr3(re, im, 115, 117, 119);
      MXRot(re, im, 117, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 119, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 114, 115);
      MXTr2(re, im, 116, 117);
      MXTr2(re, im, 118, 119);
      MXTr4(re, im, 120, 126, 132, 138);
      MXTr4(re, im, 121, 127, 133, 139);
      MXTr4(re, im, 122, 128, 134, 140);
      MXTr4(re, im, 123, 129, 135, 141);
      MXTr4(re, im, 124, 130, 136, 142);
      MXTr4(re, im, 125, 131, 137, 143);
      MXRot(re, im, 127, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 128, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 129, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 130, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 131, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 133, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 134, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 135, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 136, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 137, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 139, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 140, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 141, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 142, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 143, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 120, 122, 124);
      MXTr3(re, im, 121, 123, 125);
      MXRot(re, im, 123, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 125, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 120, 121);
      MXTr2(re, im, 122, 123);
      MXTr2(re, im, 124, 125);
      MXTr3(re, im, 126, 128, 130);
      MXTr3(re, im, 127, 129, 131);
      MXRot(re, im, 129, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 131, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 126, 127);
      MXTr2(re, im, 128, 129);
      MXTr2(re, im, 130, 131);
      MXTr3(re, im, 132, 134, 136);
      MXTr3(re, im, 133, 135, 137);
      MXRot(re, im, 135, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 137, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 132, 133);
      MXTr2(re, im, 134, 135);
      MXTr2(re, im, 136, 137);
      MXTr3(re, im, 138, 140, 142);
      MXTr3(re, im, 139, 141, 143);
      MXRot(re, im, 141, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 143, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 138, 139);
      MXTr2(re, im, 140, 141);
      MXTr2(re, im, 142, 143);
      MXTr4(re, im, 144, 150, 156, 162);
      MXTr4(re, im, 145, 151, 157, 163);
      MXTr4(re, im, 146, 152, 158, 164);
      MXTr4(re, im, 147, 153, 159, 165);
      MXTr4(re, im, 148, 154, 160, 166);
      MXTr4(re, im, 149, 155, 161, 167);
      MXRot(re, im, 151, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 152, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 153, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 154, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 155, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 157, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 158, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 159, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 160, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 161, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 163, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 164, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 165, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 166, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 167, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 144, 146, 148);
      MXTr3(re, im, 145, 147, 149);
      MXRot(re, im, 147, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 149, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 144, 145);
      MXTr2(re, im, 146, 147);
      MXTr2(re, im, 148, 149);
      MXTr3(re, im, 150, 152, 154);
      MXTr3(re, im, 151, 153, 155);
      MXRot(re, im, 153, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 155, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 150, 151);
      MXTr2(re, im, 152, 153);
      MXTr2(re, im, 154, 155);
      MXTr3(re, im, 156, 158, 160);
      MXTr3(re, im, 157, 159, 161);
      MXRot(re, im, 159, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 161, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 156, 157);
      MXTr2(re, im, 158, 159);
      MXTr2(re, im, 160, 161);
      MXTr3(re, im, 162, 164, 166);
      MXTr3(re, im, 163, 165, 167);
      MXRot(re, im, 165, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 167, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 162, 163);
      MXTr2(re, im, 164, 165);
      MXTr2(re, im, 166, 167);
      MXTr4(re, im, 168, 174, 180, 186);
      MXTr4(re, im, 169, 175, 181, 187);
      MXTr4(re, im, 170, 176, 182, 188);
      MXTr4(re, im, 171, 177, 183, 189);
      MXTr4(re, im, 172, 178, 184, 190);
      MXTr4(re, im, 173, 179, 185, 191);
      MXRot(re, im, 175, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 176, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 177, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 178, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 179, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 181, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 182, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 183, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 184, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 185, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 187, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 188, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 189, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 190, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 191, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 168, 170, 172);
      MXTr3(re, im, 169, 171, 173);
      MXRot(re, im, 171, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 173, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 168, 169);
      MXTr2(re, im, 170, 171);
      MXTr2(re, im, 172, 173);
      MXTr3(re, im, 174, 176, 178);
      MXTr3(re, im, 175, 177, 179);
      MXRot(re, im, 177, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 179, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 174, 175);
      MXTr2(re, im, 176, 177);
      MXTr2(re, im, 178, 179);
      MXTr3(re, im, 180, 182, 184);
      MXTr3(re, im, 181, 183, 185);
      MXRot(re, im, 183, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 185, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 180, 181);
      MXTr2(re, im, 182, 183);
      MXTr2(re, im, 184, 185);
      MXTr3(re, im, 186, 188, 190);
      MXTr3(re, im, 187, 189, 191);
      MXRot(re, im, 189, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 191, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 186, 187);
      MXTr2(re, im, 188, 189);
      MXTr2(re, im, 190, 191);
      MXTr4(re, im, 192, 216, 240, 264);
      MXTr4(re, im, 193, 217, 241, 265);
      MXTr4(re, im, 194, 218, 242, 266);
      MXTr4(re, im, 195, 219, 243, 267);
      MXTr4(re, im, 196, 220, 244, 268);
      MXTr4(re, im, 197, 221, 245, 269);
      MXTr4(re, im, 198, 222, 246, 270);
      MXTr4(re, im, 199, 223, 247, 271);
      MXTr4(re, im, 200, 224, 248, 272);
      MXTr4(re, im, 201, 225, 249, 273);
      MXTr4(re, im, 202, 226, 250, 274);
      MXTr4(re, im, 203, 227, 251, 275);
      MXTr4(re, im, 204, 228, 252, 276);
      MXTr4(re, im, 205, 229, 253, 277);
      MXTr4(re, im, 206, 230, 254, 278);
      MXTr4(re, im, 207, 231, 255, 279);
      MXTr4(re, im, 208, 232, 256, 280);
      MXTr4(re, im, 209, 233, 257, 281);
      MXTr4(re, im, 210, 234, 258, 282);
      MXTr4(re, im, 211, 235, 259, 283);
      MXTr4(re, im, 212, 236, 260, 284);
      MXTr4(re, im, 213, 237, 261, 285);
      MXTr4(re, im, 214, 238, 262, 286);
      MXTr4(re, im, 215, 239, 263, 287);
      MXRot(re, im, 217, 0.9978589232386035, -0.06540312923014306);
      MXRot(re, im, 218, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 219, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 220, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 221, 0.9469301294951057, -0.32143946530316153);
      MXRot(re, im, 222, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 223, 0.8968727415326884, -0.44228869021900125);
      MXRot(re, im, 224, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 225, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 226, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 227, 0.7518398074789774, -0.6593458151000688);
      MXRot(re, im, 228, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 229, 0.659345815100069, -0.7518398074789773);
      MXRot(re, im, 230, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 231, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 232, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 233, 0.44228869021900147, -0.8968727415326883);
      MXRot(re, im, 234, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 235, 0.3214394653031617, -0.9469301294951056);
      MXRot(re, im, 236, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 237, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 238, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 239, 0.06540312923014327, -0.9978589232386035);
      MXRot(re, im, 241, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 242, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 243, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 244, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 245, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 246, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 247, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 248, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 249, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 250, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 251, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 252, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 253, -0.13052619222005138, -0.9914448613738105);
      MXRot(re, im, 254, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 255, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 256, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 257, -0.6087614290087203, -0.7933533402912354);
      MXRot(re, im, 258, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 259, -0.793353340291235, -0.6087614290087209);
      MXRot(re, im, 260, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 261, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 262, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 263, -0.9914448613738104, -0.130526192220052);
      MXRot(re, im, 265, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 266, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 267, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 268, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 269, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 270, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 271, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 272, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 273, -0.19509032201612797, -0.9807852804032305);
      MXRot(re, im, 274, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 275, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 276, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 277, -0.831469612302545, -0.5555702330196025);
      MXRot(re, im, 278, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 279, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 280, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 281, -0.9807852804032305, 0.19509032201612792);
      MXRot(re, im, 282, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 283, -0.8314696123025455, 0.555570233019602);
      MXRot(re, im, 284, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 285, -0.555570233019603, 0.8314696123025448);
      MXRot(re, im, 286, -0.38268343236509034, 0.9238795325112865);
      MXRot(re, im, 287, -0.19509032201612866, 0.9807852804032303);
    }

    function ApplyMixedRadixFFT_480_Part3(re, im) {
      MXTr4(re, im, 192, 198, 204, 210);
      MXTr4(re, im, 193, 199, 205, 211);
      MXTr4(re, im, 194, 200, 206, 212);
      MXTr4(re, im, 195, 201, 207, 213);
      MXTr4(re, im, 196, 202, 208, 214);
      MXTr4(re, im, 197, 203, 209, 215);
      MXRot(re, im, 199, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 200, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 201, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 202, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 203, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 205, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 206, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 207, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 208, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 209, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 211, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 212, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 213, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 214, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 215, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 192, 194, 196);
      MXTr3(re, im, 193, 195, 197);
      MXRot(re, im, 195, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 197, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 192, 193);
      MXTr2(re, im, 194, 195);
      MXTr2(re, im, 196, 197);
      MXTr3(re, im, 198, 200, 202);
      MXTr3(re, im, 199, 201, 203);
      MXRot(re, im, 201, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 203, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 198, 199);
      MXTr2(re, im, 200, 201);
      MXTr2(re, im, 202, 203);
      MXTr3(re, im, 204, 206, 208);
      MXTr3(re, im, 205, 207, 209);
      MXRot(re, im, 207, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 209, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 204, 205);
      MXTr2(re, im, 206, 207);
      MXTr2(re, im, 208, 209);
      MXTr3(re, im, 210, 212, 214);
      MXTr3(re, im, 211, 213, 215);
      MXRot(re, im, 213, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 215, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 210, 211);
      MXTr2(re, im, 212, 213);
      MXTr2(re, im, 214, 215);
      MXTr4(re, im, 216, 222, 228, 234);
      MXTr4(re, im, 217, 223, 229, 235);
      MXTr4(re, im, 218, 224, 230, 236);
      MXTr4(re, im, 219, 225, 231, 237);
      MXTr4(re, im, 220, 226, 232, 238);
      MXTr4(re, im, 221, 227, 233, 239);
      MXRot(re, im, 223, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 224, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 225, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 226, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 227, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 229, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 230, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 231, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 232, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 233, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 235, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 236, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 237, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 238, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 239, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 216, 218, 220);
      MXTr3(re, im, 217, 219, 221);
      MXRot(re, im, 219, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 221, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 216, 217);
      MXTr2(re, im, 218, 219);
      MXTr2(re, im, 220, 221);
      MXTr3(re, im, 222, 224, 226);
      MXTr3(re, im, 223, 225, 227);
      MXRot(re, im, 225, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 227, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 222, 223);
      MXTr2(re, im, 224, 225);
      MXTr2(re, im, 226, 227);
      MXTr3(re, im, 228, 230, 232);
      MXTr3(re, im, 229, 231, 233);
      MXRot(re, im, 231, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 233, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 228, 229);
      MXTr2(re, im, 230, 231);
      MXTr2(re, im, 232, 233);
      MXTr3(re, im, 234, 236, 238);
      MXTr3(re, im, 235, 237, 239);
      MXRot(re, im, 237, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 239, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 234, 235);
      MXTr2(re, im, 236, 237);
      MXTr2(re, im, 238, 239);
      MXTr4(re, im, 240, 246, 252, 258);
      MXTr4(re, im, 241, 247, 253, 259);
      MXTr4(re, im, 242, 248, 254, 260);
      MXTr4(re, im, 243, 249, 255, 261);
      MXTr4(re, im, 244, 250, 256, 262);
      MXTr4(re, im, 245, 251, 257, 263);
      MXRot(re, im, 247, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 248, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 249, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 250, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 251, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 253, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 254, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 255, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 256, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 257, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 259, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 260, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 261, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 262, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 263, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 240, 242, 244);
      MXTr3(re, im, 241, 243, 245);
      MXRot(re, im, 243, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 245, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 240, 241);
      MXTr2(re, im, 242, 243);
      MXTr2(re, im, 244, 245);
      MXTr3(re, im, 246, 248, 250);
      MXTr3(re, im, 247, 249, 251);
      MXRot(re, im, 249, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 251, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 246, 247);
      MXTr2(re, im, 248, 249);
      MXTr2(re, im, 250, 251);
      MXTr3(re, im, 252, 254, 256);
      MXTr3(re, im, 253, 255, 257);
      MXRot(re, im, 255, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 257, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 252, 253);
      MXTr2(re, im, 254, 255);
      MXTr2(re, im, 256, 257);
      MXTr3(re, im, 258, 260, 262);
      MXTr3(re, im, 259, 261, 263);
      MXRot(re, im, 261, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 263, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 258, 259);
      MXTr2(re, im, 260, 261);
      MXTr2(re, im, 262, 263);
      MXTr4(re, im, 264, 270, 276, 282);
      MXTr4(re, im, 265, 271, 277, 283);
      MXTr4(re, im, 266, 272, 278, 284);
      MXTr4(re, im, 267, 273, 279, 285);
      MXTr4(re, im, 268, 274, 280, 286);
      MXTr4(re, im, 269, 275, 281, 287);
      MXRot(re, im, 271, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 272, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 273, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 274, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 275, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 277, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 278, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 279, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 280, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 281, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 283, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 284, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 285, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 286, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 287, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 264, 266, 268);
      MXTr3(re, im, 265, 267, 269);
      MXRot(re, im, 267, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 269, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 264, 265);
      MXTr2(re, im, 266, 267);
      MXTr2(re, im, 268, 269);
      MXTr3(re, im, 270, 272, 274);
      MXTr3(re, im, 271, 273, 275);
      MXRot(re, im, 273, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 275, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 270, 271);
      MXTr2(re, im, 272, 273);
      MXTr2(re, im, 274, 275);
      MXTr3(re, im, 276, 278, 280);
      MXTr3(re, im, 277, 279, 281);
      MXRot(re, im, 279, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 281, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 276, 277);
      MXTr2(re, im, 278, 279);
      MXTr2(re, im, 280, 281);
      MXTr3(re, im, 282, 284, 286);
      MXTr3(re, im, 283, 285, 287);
      MXRot(re, im, 285, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 287, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 282, 283);
      MXTr2(re, im, 284, 285);
      MXTr2(re, im, 286, 287);
      MXTr4(re, im, 288, 312, 336, 360);
      MXTr4(re, im, 289, 313, 337, 361);
      MXTr4(re, im, 290, 314, 338, 362);
      MXTr4(re, im, 291, 315, 339, 363);
      MXTr4(re, im, 292, 316, 340, 364);
      MXTr4(re, im, 293, 317, 341, 365);
      MXTr4(re, im, 294, 318, 342, 366);
      MXTr4(re, im, 295, 319, 343, 367);
      MXTr4(re, im, 296, 320, 344, 368);
      MXTr4(re, im, 297, 321, 345, 369);
      MXTr4(re, im, 298, 322, 346, 370);
      MXTr4(re, im, 299, 323, 347, 371);
      MXTr4(re, im, 300, 324, 348, 372);
      MXTr4(re, im, 301, 325, 349, 373);
      MXTr4(re, im, 302, 326, 350, 374);
      MXTr4(re, im, 303, 327, 351, 375);
      MXTr4(re, im, 304, 328, 352, 376);
      MXTr4(re, im, 305, 329, 353, 377);
      MXTr4(re, im, 306, 330, 354, 378);
      MXTr4(re, im, 307, 331, 355, 379);
      MXTr4(re, im, 308, 332, 356, 380);
      MXTr4(re, im, 309, 333, 357, 381);
      MXTr4(re, im, 310, 334, 358, 382);
      MXTr4(re, im, 311, 335, 359, 383);
      MXRot(re, im, 313, 0.9978589232386035, -0.06540312923014306);
      MXRot(re, im, 314, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 315, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 316, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 317, 0.9469301294951057, -0.32143946530316153);
      MXRot(re, im, 318, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 319, 0.8968727415326884, -0.44228869021900125);
      MXRot(re, im, 320, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 321, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 322, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 323, 0.7518398074789774, -0.6593458151000688);
      MXRot(re, im, 324, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 325, 0.659345815100069, -0.7518398074789773);
      MXRot(re, im, 326, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 327, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 328, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 329, 0.44228869021900147, -0.8968727415326883);
      MXRot(re, im, 330, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 331, 0.3214394653031617, -0.9469301294951056);
      MXRot(re, im, 332, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 333, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 334, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 335, 0.06540312923014327, -0.9978589232386035);
      MXRot(re, im, 337, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 338, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 339, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 340, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 341, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 342, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 343, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 344, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 345, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 346, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 347, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 348, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 349, -0.13052619222005138, -0.9914448613738105);
      MXRot(re, im, 350, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 351, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 352, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 353, -0.6087614290087203, -0.7933533402912354);
      MXRot(re, im, 354, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 355, -0.793353340291235, -0.6087614290087209);
      MXRot(re, im, 356, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 357, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 358, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 359, -0.9914448613738104, -0.130526192220052);
      MXRot(re, im, 361, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 362, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 363, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 364, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 365, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 366, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 367, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 368, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 369, -0.19509032201612797, -0.9807852804032305);
      MXRot(re, im, 370, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 371, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 372, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 373, -0.831469612302545, -0.5555702330196025);
      MXRot(re, im, 374, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 375, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 376, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 377, -0.9807852804032305, 0.19509032201612792);
      MXRot(re, im, 378, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 379, -0.8314696123025455, 0.555570233019602);
      MXRot(re, im, 380, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 381, -0.555570233019603, 0.8314696123025448);
      MXRot(re, im, 382, -0.38268343236509034, 0.9238795325112865);
      MXRot(re, im, 383, -0.19509032201612866, 0.9807852804032303);
      MXTr4(re, im, 288, 294, 300, 306);
      MXTr4(re, im, 289, 295, 301, 307);
      MXTr4(re, im, 290, 296, 302, 308);
      MXTr4(re, im, 291, 297, 303, 309);
      MXTr4(re, im, 292, 298, 304, 310);
      MXTr4(re, im, 293, 299, 305, 311);
      MXRot(re, im, 295, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 296, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 297, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 298, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 299, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 301, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 302, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 303, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 304, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 305, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 307, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 308, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 309, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 310, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 311, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 288, 290, 292);
      MXTr3(re, im, 289, 291, 293);
      MXRot(re, im, 291, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 293, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 288, 289);
      MXTr2(re, im, 290, 291);
      MXTr2(re, im, 292, 293);
      MXTr3(re, im, 294, 296, 298);
      MXTr3(re, im, 295, 297, 299);
      MXRot(re, im, 297, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 299, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 294, 295);
      MXTr2(re, im, 296, 297);
      MXTr2(re, im, 298, 299);
      MXTr3(re, im, 300, 302, 304);
      MXTr3(re, im, 301, 303, 305);
      MXRot(re, im, 303, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 305, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 300, 301);
      MXTr2(re, im, 302, 303);
      MXTr2(re, im, 304, 305);
      MXTr3(re, im, 306, 308, 310);
      MXTr3(re, im, 307, 309, 311);
      MXRot(re, im, 309, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 311, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 306, 307);
      MXTr2(re, im, 308, 309);
      MXTr2(re, im, 310, 311);
      MXTr4(re, im, 312, 318, 324, 330);
      MXTr4(re, im, 313, 319, 325, 331);
      MXTr4(re, im, 314, 320, 326, 332);
      MXTr4(re, im, 315, 321, 327, 333);
      MXTr4(re, im, 316, 322, 328, 334);
      MXTr4(re, im, 317, 323, 329, 335);
      MXRot(re, im, 319, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 320, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 321, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 322, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 323, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 325, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 326, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 327, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 328, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 329, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 331, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 332, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 333, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 334, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 335, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 312, 314, 316);
      MXTr3(re, im, 313, 315, 317);
      MXRot(re, im, 315, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 317, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 312, 313);
      MXTr2(re, im, 314, 315);
      MXTr2(re, im, 316, 317);
      MXTr3(re, im, 318, 320, 322);
      MXTr3(re, im, 319, 321, 323);
      MXRot(re, im, 321, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 323, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 318, 319);
      MXTr2(re, im, 320, 321);
      MXTr2(re, im, 322, 323);
      MXTr3(re, im, 324, 326, 328);
      MXTr3(re, im, 325, 327, 329);
      MXRot(re, im, 327, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 329, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 324, 325);
      MXTr2(re, im, 326, 327);
      MXTr2(re, im, 328, 329);
      MXTr3(re, im, 330, 332, 334);
      MXTr3(re, im, 331, 333, 335);
      MXRot(re, im, 333, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 335, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 330, 331);
      MXTr2(re, im, 332, 333);
      MXTr2(re, im, 334, 335);
      MXTr4(re, im, 336, 342, 348, 354);
      MXTr4(re, im, 337, 343, 349, 355);
      MXTr4(re, im, 338, 344, 350, 356);
      MXTr4(re, im, 339, 345, 351, 357);
      MXTr4(re, im, 340, 346, 352, 358);
      MXTr4(re, im, 341, 347, 353, 359);
      MXRot(re, im, 343, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 344, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 345, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 346, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 347, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 349, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 350, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 351, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 352, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 353, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 355, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 356, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 357, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 358, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 359, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 336, 338, 340);
      MXTr3(re, im, 337, 339, 341);
      MXRot(re, im, 339, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 341, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 336, 337);
      MXTr2(re, im, 338, 339);
      MXTr2(re, im, 340, 341);
      MXTr3(re, im, 342, 344, 346);
      MXTr3(re, im, 343, 345, 347);
      MXRot(re, im, 345, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 347, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 342, 343);
      MXTr2(re, im, 344, 345);
      MXTr2(re, im, 346, 347);
      MXTr3(re, im, 348, 350, 352);
      MXTr3(re, im, 349, 351, 353);
      MXRot(re, im, 351, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 353, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 348, 349);
      MXTr2(re, im, 350, 351);
      MXTr2(re, im, 352, 353);
      MXTr3(re, im, 354, 356, 358);
      MXTr3(re, im, 355, 357, 359);
      MXRot(re, im, 357, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 359, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 354, 355);
      MXTr2(re, im, 356, 357);
      MXTr2(re, im, 358, 359);
      MXTr4(re, im, 360, 366, 372, 378);
      MXTr4(re, im, 361, 367, 373, 379);
      MXTr4(re, im, 362, 368, 374, 380);
      MXTr4(re, im, 363, 369, 375, 381);
      MXTr4(re, im, 364, 370, 376, 382);
      MXTr4(re, im, 365, 371, 377, 383);
      MXRot(re, im, 367, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 368, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 369, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 370, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 371, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 373, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 374, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 375, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 376, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 377, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 379, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 380, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 381, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 382, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 383, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 360, 362, 364);
      MXTr3(re, im, 361, 363, 365);
      MXRot(re, im, 363, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 365, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 360, 361);
      MXTr2(re, im, 362, 363);
      MXTr2(re, im, 364, 365);
      MXTr3(re, im, 366, 368, 370);
      MXTr3(re, im, 367, 369, 371);
      MXRot(re, im, 369, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 371, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 366, 367);
      MXTr2(re, im, 368, 369);
      MXTr2(re, im, 370, 371);
      MXTr3(re, im, 372, 374, 376);
      MXTr3(re, im, 373, 375, 377);
      MXRot(re, im, 375, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 377, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 372, 373);
      MXTr2(re, im, 374, 375);
      MXTr2(re, im, 376, 377);
      MXTr3(re, im, 378, 380, 382);
      MXTr3(re, im, 379, 381, 383);
      MXRot(re, im, 381, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 383, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 378, 379);
      MXTr2(re, im, 380, 381);
      MXTr2(re, im, 382, 383);
      MXTr4(re, im, 384, 408, 432, 456);
      MXTr4(re, im, 385, 409, 433, 457);
      MXTr4(re, im, 386, 410, 434, 458);
      MXTr4(re, im, 387, 411, 435, 459);
      MXTr4(re, im, 388, 412, 436, 460);
      MXTr4(re, im, 389, 413, 437, 461);
      MXTr4(re, im, 390, 414, 438, 462);
      MXTr4(re, im, 391, 415, 439, 463);
      MXTr4(re, im, 392, 416, 440, 464);
      MXTr4(re, im, 393, 417, 441, 465);
      MXTr4(re, im, 394, 418, 442, 466);
      MXTr4(re, im, 395, 419, 443, 467);
      MXTr4(re, im, 396, 420, 444, 468);
      MXTr4(re, im, 397, 421, 445, 469);
      MXTr4(re, im, 398, 422, 446, 470);
      MXTr4(re, im, 399, 423, 447, 471);
      MXTr4(re, im, 400, 424, 448, 472);
      MXTr4(re, im, 401, 425, 449, 473);
      MXTr4(re, im, 402, 426, 450, 474);
      MXTr4(re, im, 403, 427, 451, 475);
      MXTr4(re, im, 404, 428, 452, 476);
      MXTr4(re, im, 405, 429, 453, 477);
      MXTr4(re, im, 406, 430, 454, 478);
      MXTr4(re, im, 407, 431, 455, 479);
      MXRot(re, im, 409, 0.9978589232386035, -0.06540312923014306);
      MXRot(re, im, 410, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 411, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 412, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 413, 0.9469301294951057, -0.32143946530316153);
      MXRot(re, im, 414, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 415, 0.8968727415326884, -0.44228869021900125);
      MXRot(re, im, 416, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 417, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 418, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 419, 0.7518398074789774, -0.6593458151000688);
      MXRot(re, im, 420, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 421, 0.659345815100069, -0.7518398074789773);
      MXRot(re, im, 422, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 423, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 424, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 425, 0.44228869021900147, -0.8968727415326883);
      MXRot(re, im, 426, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 427, 0.3214394653031617, -0.9469301294951056);
      MXRot(re, im, 428, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 429, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 430, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 431, 0.06540312923014327, -0.9978589232386035);
      MXRot(re, im, 433, 0.9914448613738104, -0.13052619222005157);
      MXRot(re, im, 434, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 435, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 436, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 437, 0.7933533402912353, -0.6087614290087205);
      MXRot(re, im, 438, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 439, 0.6087614290087207, -0.7933533402912352);
      MXRot(re, im, 440, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 441, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 442, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 443, 0.1305261922200517, -0.9914448613738104);
      MXRot(re, im, 444, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 445, -0.13052619222005138, -0.9914448613738105);
      MXRot(re, im, 446, -0.25881904510252063, -0.9659258262890683);
      MXRot(re, im, 447, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 448, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 449, -0.6087614290087203, -0.7933533402912354);
      MXRot(re, im, 450, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 451, -0.793353340291235, -0.6087614290087209);
      MXRot(re, im, 452, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 453, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 454, -0.9659258262890682, -0.258819045102521);
      MXRot(re, im, 455, -0.9914448613738104, -0.130526192220052);
      MXRot(re, im, 457, 0.9807852804032304, -0.19509032201612825);
      MXRot(re, im, 458, 0.9238795325112867, -0.3826834323650898);
      MXRot(re, im, 459, 0.8314696123025452, -0.5555702330196022);
      MXRot(re, im, 460, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 461, 0.5555702330196024, -0.8314696123025451);
      MXRot(re, im, 462, 0.38268343236508984, -0.9238795325112867);
      MXRot(re, im, 463, 0.19509032201612833, -0.9807852804032304);
      MXRot(re, im, 464, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 465, -0.19509032201612797, -0.9807852804032305);
      MXRot(re, im, 466, -0.3826834323650895, -0.9238795325112868);
      MXRot(re, im, 467, -0.555570233019602, -0.8314696123025455);
      MXRot(re, im, 468, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 469, -0.831469612302545, -0.5555702330196025);
      MXRot(re, im, 470, -0.9238795325112867, -0.3826834323650899);
      MXRot(re, im, 471, -0.9807852804032304, -0.1950903220161286);
      MXRot(re, im, 472, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 473, -0.9807852804032305, 0.19509032201612792);
      MXRot(re, im, 474, -0.923879532511287, 0.3826834323650892);
      MXRot(re, im, 475, -0.8314696123025455, 0.555570233019602);
      MXRot(re, im, 476, -0.7071067811865479, 0.7071067811865471);
      MXRot(re, im, 477, -0.555570233019603, 0.8314696123025448);
      MXRot(re, im, 478, -0.38268343236509034, 0.9238795325112865);
      MXRot(re, im, 479, -0.19509032201612866, 0.9807852804032303);
    }

    function ApplyMixedRadixFFT_480_Part4(re, im) {
      MXTr4(re, im, 384, 390, 396, 402);
      MXTr4(re, im, 385, 391, 397, 403);
      MXTr4(re, im, 386, 392, 398, 404);
      MXTr4(re, im, 387, 393, 399, 405);
      MXTr4(re, im, 388, 394, 400, 406);
      MXTr4(re, im, 389, 395, 401, 407);
      MXRot(re, im, 391, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 392, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 393, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 394, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 395, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 397, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 398, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 399, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 400, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 401, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 403, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 404, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 405, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 406, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 407, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 384, 386, 388);
      MXTr3(re, im, 385, 387, 389);
      MXRot(re, im, 387, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 389, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 384, 385);
      MXTr2(re, im, 386, 387);
      MXTr2(re, im, 388, 389);
      MXTr3(re, im, 390, 392, 394);
      MXTr3(re, im, 391, 393, 395);
      MXRot(re, im, 393, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 395, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 390, 391);
      MXTr2(re, im, 392, 393);
      MXTr2(re, im, 394, 395);
      MXTr3(re, im, 396, 398, 400);
      MXTr3(re, im, 397, 399, 401);
      MXRot(re, im, 399, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 401, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 396, 397);
      MXTr2(re, im, 398, 399);
      MXTr2(re, im, 400, 401);
      MXTr3(re, im, 402, 404, 406);
      MXTr3(re, im, 403, 405, 407);
      MXRot(re, im, 405, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 407, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 402, 403);
      MXTr2(re, im, 404, 405);
      MXTr2(re, im, 406, 407);
      MXTr4(re, im, 408, 414, 420, 426);
      MXTr4(re, im, 409, 415, 421, 427);
      MXTr4(re, im, 410, 416, 422, 428);
      MXTr4(re, im, 411, 417, 423, 429);
      MXTr4(re, im, 412, 418, 424, 430);
      MXTr4(re, im, 413, 419, 425, 431);
      MXRot(re, im, 415, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 416, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 417, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 418, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 419, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 421, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 422, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 423, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 424, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 425, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 427, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 428, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 429, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 430, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 431, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 408, 410, 412);
      MXTr3(re, im, 409, 411, 413);
      MXRot(re, im, 411, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 413, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 408, 409);
      MXTr2(re, im, 410, 411);
      MXTr2(re, im, 412, 413);
      MXTr3(re, im, 414, 416, 418);
      MXTr3(re, im, 415, 417, 419);
      MXRot(re, im, 417, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 419, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 414, 415);
      MXTr2(re, im, 416, 417);
      MXTr2(re, im, 418, 419);
      MXTr3(re, im, 420, 422, 424);
      MXTr3(re, im, 421, 423, 425);
      MXRot(re, im, 423, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 425, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 420, 421);
      MXTr2(re, im, 422, 423);
      MXTr2(re, im, 424, 425);
      MXTr3(re, im, 426, 428, 430);
      MXTr3(re, im, 427, 429, 431);
      MXRot(re, im, 429, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 431, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 426, 427);
      MXTr2(re, im, 428, 429);
      MXTr2(re, im, 430, 431);
      MXTr4(re, im, 432, 438, 444, 450);
      MXTr4(re, im, 433, 439, 445, 451);
      MXTr4(re, im, 434, 440, 446, 452);
      MXTr4(re, im, 435, 441, 447, 453);
      MXTr4(re, im, 436, 442, 448, 454);
      MXTr4(re, im, 437, 443, 449, 455);
      MXRot(re, im, 439, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 440, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 441, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 442, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 443, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 445, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 446, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 447, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 448, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 449, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 451, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 452, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 453, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 454, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 455, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 432, 434, 436);
      MXTr3(re, im, 433, 435, 437);
      MXRot(re, im, 435, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 437, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 432, 433);
      MXTr2(re, im, 434, 435);
      MXTr2(re, im, 436, 437);
      MXTr3(re, im, 438, 440, 442);
      MXTr3(re, im, 439, 441, 443);
      MXRot(re, im, 441, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 443, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 438, 439);
      MXTr2(re, im, 440, 441);
      MXTr2(re, im, 442, 443);
      MXTr3(re, im, 444, 446, 448);
      MXTr3(re, im, 445, 447, 449);
      MXRot(re, im, 447, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 449, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 444, 445);
      MXTr2(re, im, 446, 447);
      MXTr2(re, im, 448, 449);
      MXTr3(re, im, 450, 452, 454);
      MXTr3(re, im, 451, 453, 455);
      MXRot(re, im, 453, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 455, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 450, 451);
      MXTr2(re, im, 452, 453);
      MXTr2(re, im, 454, 455);
      MXTr4(re, im, 456, 462, 468, 474);
      MXTr4(re, im, 457, 463, 469, 475);
      MXTr4(re, im, 458, 464, 470, 476);
      MXTr4(re, im, 459, 465, 471, 477);
      MXTr4(re, im, 460, 466, 472, 478);
      MXTr4(re, im, 461, 467, 473, 479);
      MXRot(re, im, 463, 0.9659258262890683, -0.25881904510252074);
      MXRot(re, im, 464, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 465, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 466, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 467, 0.25881904510252096, -0.9659258262890682);
      MXRot(re, im, 469, 0.8660254037844387, -0.49999999999999994);
      MXRot(re, im, 470, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 471, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 472, -0.4999999999999998, -0.8660254037844387);
      MXRot(re, im, 473, -0.8660254037844385, -0.5000000000000003);
      MXRot(re, im, 475, 0.7071067811865476, -0.7071067811865475);
      MXRot(re, im, 476, 6.123233995736766e-17, -1.0);
      MXRot(re, im, 477, -0.7071067811865475, -0.7071067811865476);
      MXRot(re, im, 478, -1.0, -1.2246467991473532e-16);
      MXRot(re, im, 479, -0.7071067811865479, 0.7071067811865471);
      MXTr3(re, im, 456, 458, 460);
      MXTr3(re, im, 457, 459, 461);
      MXRot(re, im, 459, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 461, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 456, 457);
      MXTr2(re, im, 458, 459);
      MXTr2(re, im, 460, 461);
      MXTr3(re, im, 462, 464, 466);
      MXTr3(re, im, 463, 465, 467);
      MXRot(re, im, 465, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 467, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 462, 463);
      MXTr2(re, im, 464, 465);
      MXTr2(re, im, 466, 467);
      MXTr3(re, im, 468, 470, 472);
      MXTr3(re, im, 469, 471, 473);
      MXRot(re, im, 471, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 473, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 468, 469);
      MXTr2(re, im, 470, 471);
      MXTr2(re, im, 472, 473);
      MXTr3(re, im, 474, 476, 478);
      MXTr3(re, im, 475, 477, 479);
      MXRot(re, im, 477, 0.5000000000000001, -0.8660254037844386);
      MXRot(re, im, 479, -0.4999999999999998, -0.8660254037844387);
      MXTr2(re, im, 474, 475);
      MXTr2(re, im, 476, 477);
      MXTr2(re, im, 478, 479);
      MXCshft(re, im, CSHFT_INDEXES_0);
      MXCshft(re, im, CSHFT_INDEXES_1);
      MXCshft(re, im, CSHFT_INDEXES_2);
      MXCshft(re, im, CSHFT_INDEXES_3);
      MXCshft(re, im, CSHFT_INDEXES_4);
      MXCshft(re, im, CSHFT_INDEXES_5);
      MXCshft(re, im, CSHFT_INDEXES_6);
      MXCshft(re, im, CSHFT_INDEXES_7);
    }

    function ApplyMixedRadixFFT_480(re, im) {
      ApplyMixedRadixFFT_480_Part1(re, im);
      ApplyMixedRadixFFT_480_Part2(re, im);
      ApplyMixedRadixFFT_480_Part3(re, im);
      ApplyMixedRadixFFT_480_Part4(re, im);
    }

    module.exports = {
      "ApplyMixedRadixFFT_480": ApplyMixedRadixFFT_480
    };
  },
  "lc3/math/fft-mx-baseop": function lc3MathFftMxBaseop(module, require) {
    function MXTr2(re, im, i0, i1) {
      var t1_r = re[i0];
      var t1_i = im[i0];
      var t2_r = re[i1];
      var t2_i = im[i1];
      re[i0] = t1_r + t2_r;
      im[i0] = t1_i + t2_i;
      re[i1] = t1_r - t2_r;
      im[i1] = t1_i - t2_i;
    }

    function MXTr3(re, im, i0, i1, i2) {
      var i0_r = re[i0];
      var i0_i = im[i0];
      var i1_r = re[i1];
      var i1_i = im[i1];
      var i2_r = re[i2];
      var i2_i = im[i2];
      var t1_r = i1_r + i2_r;
      var t1_i = i1_i + i2_i;
      var t2_r = i0_r - 0.5 * t1_r;
      var t2_i = i0_i - 0.5 * t1_i;
      var t3_r = 0.8660254037844386 * (i1_r - i2_r);
      var t3_i = 0.8660254037844386 * (i1_i - i2_i);
      re[i0] = i0_r + t1_r;
      im[i0] = i0_i + t1_i;
      re[i1] = t2_r + t3_i;
      im[i1] = t2_i - t3_r;
      re[i2] = t2_r - t3_i;
      im[i2] = t2_i + t3_r;
    }

    function MXTr4(re, im, i0, i1, i2, i3) {
      var i0_r = re[i0];
      var i0_i = im[i0];
      var i1_r = re[i1];
      var i1_i = im[i1];
      var i2_r = re[i2];
      var i2_i = im[i2];
      var i3_r = re[i3];
      var i3_i = im[i3];
      var t1_r = i0_r + i2_r;
      var t1_i = i0_i + i2_i;
      var t2_r = i1_r + i3_r;
      var t2_i = i1_i + i3_i;
      var t3_r = i0_r - i2_r;
      var t3_i = i0_i - i2_i;
      var t4_r = i1_r - i3_r;
      var t4_i = i1_i - i3_i;
      re[i0] = t1_r + t2_r;
      im[i0] = t1_i + t2_i;
      re[i1] = t3_r + t4_i;
      im[i1] = t3_i - t4_r;
      re[i2] = t1_r - t2_r;
      im[i2] = t1_i - t2_i;
      re[i3] = t3_r - t4_i;
      im[i3] = t3_i + t4_r;
    }

    function MXTr5(re, im, i0, i1, i2, i3, i4) {
      var i0_r = re[i0];
      var i0_i = im[i0];
      var i1_r = re[i1];
      var i1_i = im[i1];
      var i2_r = re[i2];
      var i2_i = im[i2];
      var i3_r = re[i3];
      var i3_i = im[i3];
      var i4_r = re[i4];
      var i4_i = im[i4];
      var t1_r = i1_r + i4_r;
      var t1_i = i1_i + i4_i;
      var t2_r = i2_r + i3_r;
      var t2_i = i2_i + i3_i;
      var t3_r = i1_r - i4_r;
      var t3_i = i1_i - i4_i;
      var t4_r = i2_r - i3_r;
      var t4_i = i2_i - i3_i;
      var t5_r = t1_r + t2_r;
      var t5_i = t1_i + t2_i;
      var t6_r = 0.5590169943749475 * (t1_r - t2_r);
      var t6_i = 0.5590169943749475 * (t1_i - t2_i);
      var t7_r = i0_r - 0.25 * t5_r;
      var t7_i = i0_i - 0.25 * t5_i;
      var t8_r = t7_r + t6_r;
      var t8_i = t7_i + t6_i;
      var t9_r = t7_r - t6_r;
      var t9_i = t7_i - t6_i;
      var t10_r = 0.9510565162951535 * t3_r + 0.5877852522924731 * t4_r;
      var t10_i = 0.9510565162951535 * t3_i + 0.5877852522924731 * t4_i;
      var t11_r = 0.5877852522924731 * t3_r - 0.9510565162951535 * t4_r;
      var t11_i = 0.5877852522924731 * t3_i - 0.9510565162951535 * t4_i;
      re[i0] = i0_r + t5_r;
      im[i0] = i0_i + t5_i;
      re[i1] = t8_r + t10_i;
      im[i1] = t8_i - t10_r;
      re[i2] = t9_r + t11_i;
      im[i2] = t9_i - t11_r;
      re[i3] = t9_r - t11_i;
      im[i3] = t9_i + t11_r;
      re[i4] = t8_r - t10_i;
      im[i4] = t8_i + t10_r;
    }

    function MXRot(re, im, idx, c_r, c_i) {
      var i0_r = re[idx];
      var i0_i = im[idx];
      re[idx] = i0_r * c_r - i0_i * c_i;
      im[idx] = i0_r * c_i + i0_i * c_r;
    }

    function MXSwap(re, im, i0, i1) {
      var t = re[i0];
      re[i0] = re[i1];
      re[i1] = t;
      t = im[i0];
      im[i0] = im[i1];
      im[i1] = t;
    }

    function MXCshft(re, im, idxes) {
      var i_first = idxes[0];
      var r0 = re[i_first];
      var i0 = im[i_first];
      var last = idxes.length - 1;

      for (var i = 0; i < last; ++i) {
        var i_cur = idxes[i];
        var i_next = idxes[i + 1];
        re[i_cur] = re[i_next];
        im[i_cur] = im[i_next];
      }

      var i_last = idxes[last];
      re[i_last] = r0;
      im[i_last] = i0;
    }

    module.exports = {
      "MXTr2": MXTr2,
      "MXTr3": MXTr3,
      "MXTr4": MXTr4,
      "MXTr5": MXTr5,
      "MXRot": MXRot,
      "MXSwap": MXSwap,
      "MXCshft": MXCshft
    };
  },
  "lc3/math/fft-tfm-bluestein": function lc3MathFftTfmBluestein(module, require) {
    var Lc3FftTfmCore = require("./fft-tfm-core");

    var Lc3FftTfmCooleyTukey = require("./fft-tfm-cooleytukey");

    var Lc3ObjUtil = require("./../common/object_util");

    var Lc3UInt = require("./../common/uint");

    var Lc3Error = require("./../error");

    var IFFTTransformer = Lc3FftTfmCore.IFFTTransformer;
    var FFTCooleyTukeyTransformer = Lc3FftTfmCooleyTukey.FFTCooleyTukeyTransformer;
    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var IsUInt32 = Lc3UInt.IsUInt32;
    var Inherits = Lc3ObjUtil.Inherits;

    function FFTBluesteinTransformer(N) {
      IFFTTransformer.call(this);

      if (!IsUInt32(N)) {
        throw new LC3IllegalParameterError("Block size is not an unsigned 32-bit integer.");
      }

      if (N >= 0x80000000) {
        throw new LC3IllegalParameterError("Block size is not less than 0x80000000.");
      }

      var M = 1;
      var log2M = 0;
      {
        var Mleast = (N << 1 >>> 0) - 1;

        while (M < Mleast) {
          M = M << 1 >>> 0;
          ++log2M;
        }
      }
      var PiDivN = Math.PI / N;
      var MsN = M - N;
      var fft = new FFTCooleyTukeyTransformer(log2M);
      var B_RE = new Array(M);
      var B_IM = new Array(M);
      var TW_RE = new Array(N);
      var TW_IM = new Array(N);

      for (var n = 0, m = M; n < N; ++n, --m) {
        var phi = PiDivN * (n * n);
        var phi_c = Math.cos(phi);
        var phi_s = Math.sin(phi);
        TW_RE[n] = phi_c;
        TW_IM[n] = phi_s;
        B_RE[n] = phi_c;
        B_IM[n] = phi_s;

        if (n != 0) {
          B_RE[m] = phi_c;
          B_IM[m] = phi_s;
        }
      }

      for (var _n37 = N; _n37 <= MsN; ++_n37) {
        B_RE[_n37] = 0;
        B_IM[_n37] = 0;
      }

      fft.transform(B_RE, B_IM);
      var A_RE = new Array(M);
      var A_IM = new Array(M);

      this.transform = function (x_re, x_im) {
        if (x_re.length != N || x_im.length != N) {
          throw new LC3IllegalParameterError("Incorrect block size.");
        }

        for (var _n38 = 0; _n38 < N; ++_n38) {
          var xn_re = x_re[_n38],
              xn_im = x_im[_n38];
          var twn_re = TW_RE[_n38];
          var twn_im = -TW_IM[_n38];
          A_RE[_n38] = xn_re * twn_re - xn_im * twn_im;
          A_IM[_n38] = xn_im * twn_re + xn_re * twn_im;
        }

        for (var _n39 = N; _n39 < M; ++_n39) {
          A_RE[_n39] = 0;
          A_IM[_n39] = 0;
        }

        fft.transform(A_RE, A_IM);

        for (var _n40 = 0; _n40 < M; ++_n40) {
          var a_re = A_RE[_n40],
              a_im = A_IM[_n40];
          var b_re = B_RE[_n40],
              b_im = B_IM[_n40];
          A_RE[_n40] = (a_re * b_re - a_im * b_im) / M;
          A_IM[_n40] = -(a_im * b_re + a_re * b_im) / M;
        }

        fft.transform(A_RE, A_IM);

        for (var _n41 = 0; _n41 < N; ++_n41) {
          var _a_re = A_RE[_n41],
              _a_im = -A_IM[_n41];

          var _twn_re = TW_RE[_n41];

          var _twn_im = -TW_IM[_n41];

          x_re[_n41] = _a_re * _twn_re - _a_im * _twn_im;
          x_im[_n41] = _a_im * _twn_re + _a_re * _twn_im;
        }
      };
    }

    Inherits(FFTBluesteinTransformer, IFFTTransformer);
    module.exports = {
      "FFTBluesteinTransformer": FFTBluesteinTransformer
    };
  },
  "lc3/math/fft-tfm-cooleytukey": function lc3MathFftTfmCooleytukey(module, require) {
    var Lc3FftTfmCore = require("./fft-tfm-core");

    var Lc3Brp = require("./brp");

    var Lc3ObjUtil = require("./../common/object_util");

    var Lc3Error = require("./../error");

    var IFFTTransformer = Lc3FftTfmCore.IFFTTransformer;
    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var NewBitReversalPermutate = Lc3Brp.NewBitReversalPermutate;
    var Inherits = Lc3ObjUtil.Inherits;
    var WN_RE = [1.0, -1.0, 6.123233995736766e-17, 0.7071067811865476, 0.9238795325112867, 0.9807852804032304, 0.9951847266721969, 0.9987954562051724, 0.9996988186962042, 0.9999247018391445, 0.9999811752826011, 0.9999952938095762, 0.9999988234517019, 0.9999997058628822, 0.9999999264657179, 0.9999999816164293, 0.9999999954041073, 0.9999999988510269, 0.9999999997127567, 0.9999999999281892, 0.9999999999820472, 0.9999999999955118, 0.999999999998878, 0.9999999999997194, 0.9999999999999298, 0.9999999999999825, 0.9999999999999957, 0.9999999999999989, 0.9999999999999998, 0.9999999999999999, 1.0, 1.0];
    var WN_IM = [2.4492935982947064e-16, -1.2246467991473532e-16, -1.0, -0.7071067811865475, -0.3826834323650898, -0.19509032201612825, -0.0980171403295606, -0.049067674327418015, -0.024541228522912288, -0.012271538285719925, -0.006135884649154475, -0.003067956762965976, -0.0015339801862847655, -0.0007669903187427045, -0.00038349518757139556, -0.0001917475973107033, -9.587379909597734e-05, -4.793689960306688e-05, -2.396844980841822e-05, -1.1984224905069705e-05, -5.9921124526424275e-06, -2.996056226334661e-06, -1.4980281131690111e-06, -7.490140565847157e-07, -3.7450702829238413e-07, -1.8725351414619535e-07, -9.362675707309808e-08, -4.681337853654909e-08, -2.340668926827455e-08, -1.1703344634137277e-08, -5.8516723170686385e-09, -2.9258361585343192e-09];

    function FFTCooleyTukeyTransformer(stageCnt) {
      IFFTTransformer.call(this);

      if (!(Number.isInteger(stageCnt) && stageCnt > 0 && stageCnt < 32)) {
        throw new LC3IllegalParameterError("Incorrect stage count.");
      }

      var brvtable = NewBitReversalPermutate(stageCnt >>> 1);
      var blksize = 1 << stageCnt >>> 0;

      this.transform = function (x_re, x_im) {
        if (x_re.length != blksize || x_im.length != blksize) {
          throw new LC3IllegalParameterError("Incorrect block size.");
        }

        FFTArrayBitReversalShuffle2(x_re, x_im, stageCnt, brvtable);

        for (var s = 1; s <= stageCnt; ++s) {
          var wNs_r = WN_RE[s],
              wNs_i = WN_IM[s];
          var pow_2_s = 1 << s >>> 0;
          var pow_2_ss1 = pow_2_s >>> 1;

          for (var off = 0; off < blksize; off += pow_2_s) {
            var wNr_r = 1.0,
                wNr_i = 0.0;

            for (var p = off, pend = off + pow_2_ss1, q = pend; p < pend; ++p, ++q) {
              var p_r = x_re[p],
                  p_i = x_im[p];
              var q_r = x_re[q],
                  q_i = x_im[q];
              var t_r = q_r * wNr_r - q_i * wNr_i,
                  t_i = q_r * wNr_i + q_i * wNr_r;
              x_re[p] = p_r + t_r;
              x_im[p] = p_i + t_i;
              x_re[q] = p_r - t_r;
              x_im[q] = p_i - t_i;
              var wNr_r_next = wNr_r * wNs_r - wNr_i * wNs_i;
              var wNr_i_next = wNr_r * wNs_i + wNr_i * wNs_r;
              wNr_r = wNr_r_next;
              wNr_i = wNr_i_next;
            }
          }
        }
      };
    }

    function FFTArraySwap2(arr1, arr2, i1, i2) {
      var tmp = arr1[i1];
      arr1[i1] = arr1[i2];
      arr1[i2] = tmp;
      tmp = arr2[i1];
      arr2[i1] = arr2[i2];
      arr2[i2] = tmp;
    }

    function FFTArrayBitReversalShuffle2(arr1, arr2, nbits, brv_m) {
      if (nbits <= 1) {
        return;
      }

      var m = nbits >>> 1;
      var mp1 = m + 1;
      var inv = (1 << nbits >>> 0) - 1;
      var pow_2_m = 1 << m >>> 0;
      var pow_2_ms1 = pow_2_m >>> 1;

      if ((nbits & 1) >>> 0 == 0) {
        for (var a = 1; a < pow_2_ms1; ++a) {
          for (var b = 0; b < a; ++b) {
            var i = (b << m >>> 0) + brv_m[a];
            var ri = (a << m >>> 0) + brv_m[b];
            FFTArraySwap2(arr1, arr2, i, ri);
            FFTArraySwap2(arr1, arr2, (inv ^ ri) >>> 0, (inv ^ i) >>> 0);
          }
        }

        for (var _a = pow_2_ms1; _a < pow_2_m; ++_a) {
          for (var _b6 = 0; _b6 < pow_2_ms1; ++_b6) {
            var _i9 = (_b6 << m >>> 0) + brv_m[_a];

            var _ri = (_a << m >>> 0) + brv_m[_b6];

            FFTArraySwap2(arr1, arr2, _i9, _ri);
          }
        }
      } else {
        for (var _a2 = 1; _a2 < pow_2_ms1; ++_a2) {
          for (var _b7 = 0; _b7 < _a2; ++_b7) {
            var _i10 = (_b7 << mp1 >>> 0) + brv_m[_a2];

            var _ri2 = (_a2 << mp1 >>> 0) + brv_m[_b7];

            FFTArraySwap2(arr1, arr2, _i10, _ri2);
            FFTArraySwap2(arr1, arr2, (inv ^ _ri2) >>> 0, (inv ^ _i10) >>> 0);
            _i10 += pow_2_m;
            _ri2 += pow_2_m;
            FFTArraySwap2(arr1, arr2, _i10, _ri2);
            FFTArraySwap2(arr1, arr2, (inv ^ _ri2) >>> 0, (inv ^ _i10) >>> 0);
          }
        }

        for (var _a3 = pow_2_ms1; _a3 < pow_2_m; ++_a3) {
          for (var _b8 = 0; _b8 < pow_2_ms1; ++_b8) {
            var _i11 = (_b8 << mp1 >>> 0) + brv_m[_a3];

            var _ri3 = (_a3 << mp1 >>> 0) + brv_m[_b8];

            FFTArraySwap2(arr1, arr2, _i11, _ri3);
            FFTArraySwap2(arr1, arr2, _i11 + pow_2_m, _ri3 + pow_2_m);
          }
        }
      }
    }

    Inherits(FFTCooleyTukeyTransformer, IFFTTransformer);
    module.exports = {
      "FFTCooleyTukeyTransformer": FFTCooleyTukeyTransformer
    };
  },
  "lc3/math/fft-tfm-core": function lc3MathFftTfmCore(module, require) {
    function IFFTTransformer() {
      this.transform = function (x_re, x_im) {
        throw new Error("Not implemented.");
      };
    }

    function IFFTTransformerFactory() {
      this.create = function (N) {
        throw new Error("Not implemented.");
      };
    }

    module.exports = {
      "IFFTTransformer": IFFTTransformer,
      "IFFTTransformerFactory": IFFTTransformerFactory
    };
  },
  "lc3/math/fft": function lc3MathFft(module, require) {
    var Lc3FftMx60 = require("./fft-mx-60");

    var Lc3FftMx80 = require("./fft-mx-80");

    var Lc3FftMx120 = require("./fft-mx-120");

    var Lc3FftMx160 = require("./fft-mx-160");

    var Lc3FftMx180 = require("./fft-mx-180");

    var Lc3FftMx240 = require("./fft-mx-240");

    var Lc3FftMx320 = require("./fft-mx-320");

    var Lc3FftMx360 = require("./fft-mx-360");

    var Lc3FftMx480 = require("./fft-mx-480");

    var Lc3FftTfmCore = require("./fft-tfm-core");

    var Lc3FftTfmBluestein = require("./fft-tfm-bluestein");

    var Lc3FftTfmCooleyTukey = require("./fft-tfm-cooleytukey");

    var Lc3UInt = require("./../common/uint");

    var Lc3Error = require("./../error");

    var IFFTTransformerFactory = Lc3FftTfmCore.IFFTTransformerFactory;
    var FFTBluesteinTransformer = Lc3FftTfmBluestein.FFTBluesteinTransformer;
    var FFTCooleyTukeyTransformer = Lc3FftTfmCooleyTukey.FFTCooleyTukeyTransformer;
    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var IsUInt32 = Lc3UInt.IsUInt32;
    var ApplyMixedRadixFFT_60 = Lc3FftMx60.ApplyMixedRadixFFT_60;
    var ApplyMixedRadixFFT_80 = Lc3FftMx80.ApplyMixedRadixFFT_80;
    var ApplyMixedRadixFFT_120 = Lc3FftMx120.ApplyMixedRadixFFT_120;
    var ApplyMixedRadixFFT_160 = Lc3FftMx160.ApplyMixedRadixFFT_160;
    var ApplyMixedRadixFFT_180 = Lc3FftMx180.ApplyMixedRadixFFT_180;
    var ApplyMixedRadixFFT_240 = Lc3FftMx240.ApplyMixedRadixFFT_240;
    var ApplyMixedRadixFFT_320 = Lc3FftMx320.ApplyMixedRadixFFT_320;
    var ApplyMixedRadixFFT_360 = Lc3FftMx360.ApplyMixedRadixFFT_360;
    var ApplyMixedRadixFFT_480 = Lc3FftMx480.ApplyMixedRadixFFT_480;
    var g_CustomTransformerFactory = null;

    function FFT(N) {
      if (!IsUInt32(N)) {
        throw new LC3IllegalParameterError("Block size is not an unsigned 32-bit integer.");
      }

      if (N > 0x80000000) {
        throw new LC3IllegalParameterError("Block size is larger than 0x80000000.");
      }

      var mx_func = null;
      var transformer = null;

      if (g_CustomTransformerFactory !== null) {
        transformer = g_CustomTransformerFactory.create(N);
      } else {
        if (N == 60) {
          mx_func = ApplyMixedRadixFFT_60;
        } else if (N == 80) {
          mx_func = ApplyMixedRadixFFT_80;
        } else if (N == 120) {
          mx_func = ApplyMixedRadixFFT_120;
        } else if (N == 160) {
          mx_func = ApplyMixedRadixFFT_160;
        } else if (N == 180) {
          mx_func = ApplyMixedRadixFFT_180;
        } else if (N == 240) {
          mx_func = ApplyMixedRadixFFT_240;
        } else if (N == 320) {
          mx_func = ApplyMixedRadixFFT_320;
        } else if (N == 360) {
          mx_func = ApplyMixedRadixFFT_360;
        } else if (N == 480) {
          mx_func = ApplyMixedRadixFFT_480;
        } else {
          for (var i = 31; i > 0; --i) {
            if (N == 1 << i >>> 0) {
              transformer = new FFTCooleyTukeyTransformer(i);
            }
          }

          if (transformer === null) {
            transformer = new FFTBluesteinTransformer(N);
          }
        }
      }

      this.transform = function (x_re, x_im) {
        if (x_re.length != N || x_im.length != N) {
          throw new LC3IllegalParameterError("Incorrect block size.");
        }

        if (mx_func !== null) {
          mx_func.call(this, x_re, x_im);
          return;
        }

        transformer.transform(x_re, x_im);
      };
    }

    function SetCustomTransformer(factory) {
      if (!(factory instanceof IFFTTransformerFactory)) {
        throw new LC3IllegalParameterError("Bad transformer factory object.");
      }

      g_CustomTransformerFactory = factory;
    }

    function UnsetCustomTransformer() {
      g_CustomTransformerFactory = null;
    }

    function FindBestCorrelationSize(minsz) {
      if (minsz == 1 || minsz == 2 || minsz == 4 || minsz == 8 || minsz == 16 || minsz == 32) {
        return minsz;
      } else if (minsz <= 60) {
        return 60;
      } else if (minsz == 64) {
        return 64;
      } else if (minsz <= 80) {
        return 80;
      } else if (minsz <= 120) {
        return 120;
      } else if (minsz == 128) {
        return 128;
      } else if (minsz <= 160) {
        return 160;
      } else if (minsz <= 180) {
        return 180;
      } else if (minsz <= 240) {
        return 240;
      } else if (minsz == 256) {
        return 256;
      } else if (minsz <= 320) {
        return 320;
      } else if (minsz <= 480) {
        return 480;
      } else {
        var ret = 512;

        while (ret < minsz) {
          ret = ret << 1 >>> 0;
        }

        return ret;
      }
    }

    module.exports = {
      "FFT": FFT,
      "SetCustomTransformer": SetCustomTransformer,
      "UnsetCustomTransformer": UnsetCustomTransformer,
      "FindBestCorrelationSize": FindBestCorrelationSize
    };
  },
  "lc3/math/mdct": function lc3MathMdct(module, require) {
    var Lc3FFT = require("./fft");

    var Lc3UInt = require("./../common/uint");

    var Lc3Error = require("./../error");

    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var FFT = Lc3FFT.FFT;
    var IsUInt32 = Lc3UInt.IsUInt32;

    function MDCT(M) {
      var C = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      var W = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      if (!IsUInt32(M)) {
        throw new LC3IllegalParameterError("Unit size is not an unsigned 32-bit integer.");
      }

      if (M == 0) {
        throw new LC3IllegalParameterError("Unit size is zero.");
      } else if (M >= 0x80000000) {
        throw new LC3IllegalParameterError("Unit size is larger than 0x80000000.");
      }

      var N = M << 1 >>> 0;

      if (W !== null) {
        if (W.length != N) {
          throw new LC3IllegalParameterError("The size of the window sequence is not twice of the unit size.");
        }
      } else {
        W = new Array(N);

        for (var n = 0; n < N; ++n) {
          W[n] = 1;
        }
      }

      var C_div_2 = C * 0.5;
      var PI_div_2 = Math.PI * 0.5;
      var PI_div_4 = Math.PI * 0.25;
      var PI_div_2M = Math.PI / N;
      var PI_div_M = Math.PI / M;
      var M_sub_1 = M - 1;
      var fft = new FFT(M);
      var rho_even_re = new Array(M),
          rho_even_im = new Array(M);
      var rho_odd_re = new Array(M),
          rho_odd_im = new Array(M);
      var Z_re = new Array(M),
          Z_im = new Array(M);
      var TW1_re = new Array(M),
          TW1_im = new Array(M);
      var TW2_re = new Array(M),
          TW2_im = new Array(M);
      var TW3_re = new Array(M),
          TW3_im = new Array(M);

      this.transform = function (x, X) {
        if (x.length != N) {
          throw new LC3IllegalParameterError("Input block size is not twice of the unit size.");
        }

        if (X.length != M) {
          throw new LC3IllegalParameterError("Output block size is not the unit size.");
        }

        for (var _n42 = 0, u = 0; _n42 < M; ++_n42, u += 2) {
          var x1 = x[u],
              x2 = x[u + 1];
          Z_re[_n42] = x1 * rho_even_re[_n42] + x2 * rho_odd_re[_n42];
          Z_im[_n42] = x1 * rho_even_im[_n42] + x2 * rho_odd_im[_n42];
        }

        fft.transform(Z_re, Z_im);

        for (var k1 = 0, k2 = M_sub_1; k1 < M; ++k1, --k2) {
          var z1_re = Z_re[k1],
              z1_im = Z_im[k1];
          var z2_re = Z_re[k2],
              z2_im = Z_im[k2];
          var A_even_re = z1_re + z2_re;
          var A_even_im = z1_im - z2_im;
          var t1_re = z1_re - z2_re,
              t1_im = z1_im + z2_im;
          var t2_re = TW1_re[k1],
              t2_im = TW1_im[k1];
          var A_odd_re = t1_re * t2_re - t1_im * t2_im;
          var A_odd_im = t1_re * t2_im + t1_im * t2_re;
          t1_re = A_even_re + A_odd_re;
          t1_im = A_even_im + A_odd_im;
          t2_re = TW2_re[k1];
          t2_im = TW2_im[k1];
          var A_re = t1_re * t2_re - t1_im * t2_im;
          var A_im = t1_re * t2_im + t1_im * t2_re;
          X[k1] = TW3_re[k1] * A_re + TW3_im[k1] * A_im;
        }
      };

      for (var _n43 = 0, u = 0, phi1 = 0, phi3 = -(0.5 + 0.5 * M) * PI_div_M, phi4 = -0.5 * PI_div_2M, phi5 = PI_div_4; _n43 < M; ++_n43, u += 2, phi1 -= PI_div_M, phi3 -= PI_div_M, phi4 -= PI_div_2M, phi5 += PI_div_2) {
        var tmp = C_div_2 * W[u];
        rho_even_re[_n43] = tmp * Math.cos(phi1);
        rho_even_im[_n43] = tmp * Math.sin(phi1);
        var phi2 = phi1 + PI_div_2;
        tmp = C_div_2 * W[u + 1];
        rho_odd_re[_n43] = tmp * Math.cos(phi2);
        rho_odd_im[_n43] = tmp * Math.sin(phi2);
        TW1_re[_n43] = Math.cos(phi3);
        TW1_im[_n43] = Math.sin(phi3);
        TW2_re[_n43] = Math.cos(phi4);
        TW2_im[_n43] = Math.sin(phi4);
        TW3_re[_n43] = Math.cos(phi5);
        TW3_im[_n43] = Math.sin(phi5);
      }
    }

    function IMDCT(M) {
      var G_static = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
      var G_dynamic = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

      if (!IsUInt32(M)) {
        throw new LC3IllegalParameterError("Unit size is not an unsigned 32-bit integer.");
      }

      if (M == 0) {
        throw new LC3IllegalParameterError("Unit size is zero.");
      } else if (M >= 0x80000000) {
        throw new LC3IllegalParameterError("Unit size is larger than 0x80000000.");
      }

      var N = M << 1 >>> 0;

      if (G_dynamic !== null) {
        if (G_dynamic.length != N) {
          throw new LC3IllegalParameterError("The count of dynamic gain factors is not twice of the unit size.");
        }
      } else {
        G_dynamic = new Array(N);

        for (var i = 0; i < N; ++i) {
          G_dynamic[i] = 1;
        }
      }

      var N_sub_1 = N - 1;
      var M_sub_1 = M - 1;
      var Xp = new Array(N);
      var U_re = new Array(M);
      var U_im = new Array(M);
      var fft = new FFT(M);
      var TW1_re = new Array(M);
      var TW1_im = new Array(M);

      for (var k = 0; k < M; ++k) {
        var phi = -k * Math.PI / M;
        TW1_re[k] = 0.25 * G_static * Math.cos(phi) / M;
        TW1_im[k] = 0.25 * G_static * Math.sin(phi) / M;
      }

      var TW2_re = new Array(M);
      var TW2_im = new Array(M);

      for (var n = 0; n < M; ++n) {
        var _phi = -(n + 0.5) * Math.PI / M;

        TW2_re[n] = Math.cos(_phi);
        TW2_im[n] = Math.sin(_phi);
      }

      var TW3_re = new Array(N);
      var TW3_im = new Array(N);

      for (var _n44 = 0, c = Math.PI / N, _phi2 = 0.5 * (M + 1) * c; _n44 < N; ++_n44, _phi2 += c) {
        TW3_re[_n44] = Math.cos(_phi2);
        TW3_im[_n44] = Math.sin(_phi2);
      }

      this.transform = function (X, Y) {
        if (X.length != M) {
          throw new LC3IllegalParameterError("Input block size is not the unit size.");
        }

        if (Y.length != N) {
          throw new LC3IllegalParameterError("Output block size is not twice of the unit size.");
        }

        var Xp_factor = (M & 1) != 0 ? 1 : -1;

        for (var k1 = 0, k2 = N_sub_1; k1 < M; ++k1, --k2) {
          Xp[k1] = X[k1];
          Xp[k2] = Xp_factor * X[k1];
        }

        var Xm_factor = 1;

        for (var _k57 = 0, u = 0; _k57 < M; ++_k57, u += 2) {
          var a_re = Xm_factor * Xp[u],
              a_im = Xm_factor * Xp[u + 1];
          var b_re = TW1_re[_k57],
              b_im = TW1_im[_k57];
          U_re[_k57] = a_re * b_re - a_im * b_im;
          U_im[_k57] = a_re * b_im + a_im * b_re;
          Xm_factor = -Xm_factor;
        }

        fft.transform(U_re, U_im);

        for (var _k58 = 0, _k59 = M_sub_1, k3 = M; _k58 < M; ++_k58, --_k59, ++k3) {
          var z1_re = U_re[_k58],
              z1_im = U_im[_k58];
          var z2_re = U_re[_k59],
              z2_im = U_im[_k59];
          var A_conj_even_re = z1_re + z2_re;
          var A_conj_even_im = z1_im - z2_im;

          var _a_re2 = z2_re - z1_re,
              _a_im2 = -(z2_im + z1_im);

          var _b_re = TW2_re[_k58],
              _b_im = TW2_im[_k58];
          var A_conj_odd_re = _a_re2 * _b_re - _a_im2 * _b_im;
          var A_conj_odd_im = _a_re2 * _b_im + _a_im2 * _b_re;
          Y[_k58] = (TW3_re[_k58] * (A_conj_even_re + A_conj_odd_re) + TW3_im[_k58] * (A_conj_even_im + A_conj_odd_im)) * G_dynamic[_k58];
          Y[k3] = (TW3_re[k3] * (A_conj_even_re - A_conj_odd_re) + TW3_im[k3] * (A_conj_even_im - A_conj_odd_im)) * G_dynamic[k3];
        }
      };
    }

    module.exports = {
      "MDCT": MDCT,
      "IMDCT": IMDCT
    };
  },
  "lc3/math/mpvq": function lc3MathMpvq(module, require) {
    var Lc3UInt = require("./../common/uint");

    var Lc3Error = require("./../error");

    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var IsUInt32 = Lc3UInt.IsUInt32;

    function MPVQ(Nmax, Kmax) {
      if (!IsUInt32(Nmax)) {
        throw new LC3IllegalParameterError("Nmax is not an unsigned 32-bit integer.");
      }

      if (!(Number.isInteger(Kmax) && Kmax >= 0)) {
        throw new LC3IllegalParameterError("Kmax is not a non-negative integer.");
      }

      var MPVQ_offsets = new Array(Nmax);
      {
        var Arow = new Array(Kmax + 1);
        Arow[0] = 0;

        for (var k = 1; k <= Kmax; ++k) {
          Arow[k] = 1;
        }

        MPVQ_offsets[0] = Arow;
      }

      for (var n = 1; n < Nmax; ++n) {
        var Aprevrow = MPVQ_offsets[n - 1];

        var _Arow = new Array(Kmax + 1);

        _Arow[0] = 0;

        for (var _k60 = 1; _k60 <= Kmax; ++_k60) {
          _Arow[_k60] = Aprevrow[_k60 - 1] + Aprevrow[_k60] + _Arow[_k60 - 1];
        }

        MPVQ_offsets[n] = _Arow;
      }

      this.enumerate = function (X) {
        var R = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [null, null];
        var N = X.length;

        if (N > Nmax) {
          throw new LC3IllegalParameterError("Vector length exceeds N.");
        }

        var k_acc = 0;
        var index = 0;
        var next_sign_ind = 0;
        var got_sign_flag = false;

        for (var pos = N - 1, _n45 = 0; pos >= 0; --pos, ++_n45) {
          var val = X[pos];

          if (val != 0 && got_sign_flag) {
              index = index * 2 + next_sign_ind;
            }

          if (val > 0) {
            got_sign_flag = true;
            next_sign_ind = 0;
          } else if (val < 0) {
            got_sign_flag = true;
            next_sign_ind = 1;
          }

          index += MPVQ_offsets[_n45][k_acc];
          k_acc += Math.abs(val);

          if (k_acc > Kmax) {
            throw new LC3IllegalParameterError("SUM{x[n]} exceeds Kmax.");
          }
        }

        R[0] = next_sign_ind;
        R[1] = index;
        return R;
      };

      this.deenumerate = function (N, K, LS_ind, index) {
        var vec = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : new Array(N);

        if (!IsUInt32(N)) {
          throw new LC3IllegalParameterError("N is not an unsigned 32-bit integer.");
        }

        if (N > Nmax) {
          throw new LC3IllegalParameterError("N exceeds Nmax.");
        }

        if (!(Number.isInteger(K) && K >= 0)) {
          throw new LC3IllegalParameterError("K is not a non-negative integer.");
        }

        if (K > Kmax) {
          throw new LC3IllegalParameterError("K exceeds Kmax.");
        }

        if (!(Number.isInteger(index) && index >= 0)) {
          throw new LC3IllegalParameterError("MPVQ index is not a non-negative integer.");
        }

        if (vec.length != N) {
          throw new LC3IllegalParameterError("Vector size mismatches.");
        }

        if (LS_ind != 0) {
          LS_ind = -1;
        }

        for (var _n46 = 0; _n46 < N; ++_n46) {
          vec[_n46] = 0;
        }

        var k_max_local = K;

        for (var pos = 0, _n47 = N - 1; pos < N; ++pos, --_n47) {
          if (index == 0) {
            if (LS_ind < 0) {
              vec[pos] = -k_max_local;
            } else {
              vec[pos] = k_max_local;
            }

            break;
          }

          var low = 0;
          var high = k_max_local;

          while (low < high) {
            var mid = low + high;

            if ((mid & 1) != 0) {
              ++mid;
            }

            mid >>>= 1;
            var amp_offset = MPVQ_offsets[_n47][mid];

            if (amp_offset > index) {
              high = mid - 1;
            } else {
              low = mid;
            }
          }

          var k_delta = k_max_local - low;
          index -= MPVQ_offsets[_n47][low];

          if (k_delta != 0) {
              if (LS_ind < 0) {
                vec[pos] = -k_delta;
              } else {
                vec[pos] = k_delta;
              }

              if ((index & 1) >>> 0 != 0) {
                LS_ind = -1;
              } else {
                LS_ind = 0;
              }

              index >>>= 1;
              k_max_local -= k_delta;
            }
        }

        if (index != 0) {
          throw new LC3IllegalParameterError("MPVQ index is illegal.");
        }

        return vec;
      };
    }

    module.exports = {
      "MPVQ": MPVQ
    };
  },
  "lc3/math/pvq": function lc3MathPvq(module, require) {
    var Lc3UInt = require("./../common/uint");

    var Lc3Error = require("./../error");

    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var IsUInt32 = Lc3UInt.IsUInt32;

    function PVQSearch(N, K, X) {
      var R = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
      var S = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : new Array(N);

      if (!IsUInt32(N)) {
        throw new LC3IllegalParameterError("N is not an unsigned 32-bit integer.");
      }

      if (!(Number.isInteger(K) && K >= 0)) {
        throw new LC3IllegalParameterError("K is not a non-negative integer.");
      }

      if (X.length != N) {
        throw new LC3IllegalParameterError("Vector size mismatches (with N).");
      }

      if (R !== null) {
        if (R.length != N) {
          throw new LC3IllegalParameterError("Point buffer size mismatches (with N).");
        }
      } else {
        R = new Array(N);
      }

      if (S.length < N) {
        throw new LC3IllegalParameterError("Sign buffer size is too small (lower than N).");
      }

      var XabsSum = 0;

      for (var i = 0; i < N; ++i) {
        if (X[i] < 0) {
          S[i] = -1;
          X[i] = -X[i];
        } else {
          S[i] = 1;
        }

        XabsSum += X[i];
      }

      var k_begin = 0;
      var C_last = 0,
          E_last = 0;

      if (2 * K > N && XabsSum >= 1E-2) {
        var factor = (K - 1) / XabsSum;

        for (var _i12 = 0; _i12 < N; ++_i12) {
          var Ri = Math.floor(X[_i12] * factor);
          R[_i12] = Ri;
          C_last += X[_i12] * Ri;
          E_last += Ri * Ri;
          k_begin += Ri;
        }

        if (k_begin >= K) {
          k_begin = 0;
          C_last = 0;
          E_last = 0;

          for (var _i13 = 0; _i13 < N; ++_i13) {
            R[_i13] = 0;
          }
        }
      } else {
        for (var _i14 = 0; _i14 < N; ++_i14) {
          R[_i14] = 0;
        }
      }

      for (var k = k_begin; k < K; ++k) {
        var n_best = -1;
        var C_best = 0,
            C_bestSq = 0,
            E_best = 0;

        for (var n = 0; n < N; ++n) {
          var Xn = X[n];
          var Rn = R[n];
          var C = C_last + Xn;
          var E = E_last + 2 * Rn + 1;

          if (n_best < 0 || C * C * E_best > C_bestSq * E) {
            n_best = n;
            C_best = C;
            C_bestSq = C * C;
            E_best = E;
          }
        }

        C_last = C_best;
        E_last = E_best;
        ++R[n_best];
      }

      for (var _i15 = 0; _i15 < N; ++_i15) {
        X[_i15] *= S[_i15];
        R[_i15] *= S[_i15];
      }

      return R;
    }

    function PVQNormalize(X) {
      var Y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
      var N = X.length;

      if (Y !== null) {
        if (Y.length != N) {
          throw new LC3IllegalParameterError("Normalized point buffer size mismatches (with the size of X).");
        }
      } else {
        Y = new Array(N);
      }

      var Fnorm = 0;

      for (var i = 0; i < N; ++i) {
        var Xi = X[i];
        Fnorm += Xi * Xi;
      }

      Fnorm = Math.sqrt(Fnorm);

      for (var _i16 = 0; _i16 < N; ++_i16) {
        Y[_i16] = X[_i16] / Fnorm;
      }

      return Y;
    }

    module.exports = {
      "PVQSearch": PVQSearch,
      "PVQNormalize": PVQNormalize
    };
  },
  "lc3/tables/ac_spec": function lc3TablesAc_spec(module, require) {
    var AC_SPEC_LOOKUP = [0x01, 0x27, 0x07, 0x19, 0x16, 0x16, 0x1C, 0x16, 0x16, 0x16, 0x16, 0x1C, 0x1C, 0x1C, 0x22, 0x1F, 0x1F, 0x28, 0x2B, 0x2E, 0x31, 0x34, 0x0E, 0x11, 0x24, 0x24, 0x24, 0x26, 0x00, 0x39, 0x26, 0x16, 0x00, 0x08, 0x09, 0x0B, 0x2F, 0x0E, 0x0E, 0x11, 0x24, 0x24, 0x24, 0x26, 0x3B, 0x3B, 0x26, 0x16, 0x16, 0x1A, 0x2E, 0x1D, 0x1E, 0x20, 0x21, 0x23, 0x24, 0x24, 0x24, 0x26, 0x00, 0x3B, 0x17, 0x16, 0x2E, 0x2E, 0x2D, 0x2F, 0x30, 0x32, 0x32, 0x12, 0x36, 0x36, 0x36, 0x26, 0x3B, 0x3B, 0x3B, 0x16, 0x00, 0x3E, 0x3F, 0x03, 0x21, 0x02, 0x02, 0x3D, 0x14, 0x14, 0x14, 0x15, 0x3B, 0x3B, 0x27, 0x1C, 0x1C, 0x3F, 0x3F, 0x03, 0x21, 0x02, 0x02, 0x3D, 0x26, 0x26, 0x26, 0x15, 0x3B, 0x3B, 0x27, 0x1C, 0x1C, 0x06, 0x06, 0x06, 0x02, 0x12, 0x3D, 0x14, 0x15, 0x15, 0x15, 0x3B, 0x27, 0x27, 0x07, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x33, 0x33, 0x33, 0x35, 0x36, 0x14, 0x26, 0x26, 0x39, 0x27, 0x27, 0x27, 0x07, 0x18, 0x22, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x38, 0x26, 0x39, 0x39, 0x3B, 0x07, 0x07, 0x07, 0x2A, 0x2A, 0x22, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0x04, 0x04, 0x05, 0x15, 0x15, 0x3B, 0x07, 0x07, 0x07, 0x07, 0x19, 0x19, 0x19, 0x22, 0x04, 0x04, 0x04, 0x04, 0x05, 0x17, 0x17, 0x27, 0x07, 0x07, 0x07, 0x2A, 0x19, 0x19, 0x16, 0x1F, 0x1F, 0x27, 0x27, 0x27, 0x27, 0x07, 0x07, 0x2A, 0x00, 0x19, 0x16, 0x16, 0x16, 0x1C, 0x22, 0x1F, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x37, 0x28, 0x08, 0x09, 0x31, 0x31, 0x34, 0x11, 0x11, 0x11, 0x04, 0x00, 0x14, 0x11, 0x3C, 0x28, 0x28, 0x08, 0x2B, 0x1B, 0x31, 0x31, 0x0E, 0x11, 0x11, 0x11, 0x24, 0x2A, 0x2A, 0x11, 0x39, 0x39, 0x28, 0x08, 0x1A, 0x1B, 0x31, 0x0C, 0x0E, 0x11, 0x11, 0x11, 0x24, 0x00, 0x26, 0x24, 0x01, 0x08, 0x08, 0x2B, 0x09, 0x0B, 0x31, 0x0C, 0x0E, 0x0E, 0x21, 0x32, 0x32, 0x32, 0x3D, 0x24, 0x27, 0x08, 0x08, 0x2B, 0x2E, 0x31, 0x34, 0x1E, 0x0E, 0x0E, 0x21, 0x32, 0x32, 0x32, 0x32, 0x12, 0x19, 0x08, 0x08, 0x2B, 0x2E, 0x31, 0x34, 0x1E, 0x0E, 0x0E, 0x12, 0x05, 0x05, 0x05, 0x3D, 0x12, 0x17, 0x2B, 0x2B, 0x2B, 0x09, 0x31, 0x34, 0x03, 0x0E, 0x0E, 0x32, 0x32, 0x32, 0x32, 0x3D, 0x11, 0x18, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x2B, 0x09, 0x0B, 0x34, 0x34, 0x0E, 0x0E, 0x11, 0x3D, 0x3D, 0x3D, 0x36, 0x11, 0x27, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2D, 0x2C, 0x1B, 0x1D, 0x34, 0x30, 0x34, 0x34, 0x11, 0x11, 0x11, 0x11, 0x02, 0x11, 0x07, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x1B, 0x09, 0x1B, 0x1B, 0x0C, 0x34, 0x0E, 0x0E, 0x3A, 0x29, 0x29, 0x29, 0x06, 0x11, 0x25, 0x09, 0x09, 0x09, 0x1B, 0x0B, 0x31, 0x0C, 0x34, 0x0E, 0x0E, 0x0E, 0x32, 0x00, 0x35, 0x11, 0x1C, 0x34, 0x34, 0x31, 0x34, 0x0C, 0x34, 0x1E, 0x0E, 0x0E, 0x11, 0x02, 0x02, 0x02, 0x26, 0x26, 0x22, 0x1F, 0x22, 0x22, 0x1F, 0x1F, 0x1F, 0x1F, 0x13, 0x13, 0x13, 0x13, 0x13, 0x13, 0x13, 0x1F, 0x13, 0x2C, 0x2C, 0x3E, 0x1E, 0x20, 0x3A, 0x23, 0x24, 0x24, 0x26, 0x00, 0x3B, 0x07, 0x07, 0x27, 0x22, 0x22, 0x2D, 0x2F, 0x30, 0x21, 0x23, 0x23, 0x24, 0x26, 0x26, 0x26, 0x3B, 0x07, 0x07, 0x27, 0x22, 0x22, 0x3E, 0x1E, 0x0F, 0x32, 0x35, 0x35, 0x36, 0x15, 0x15, 0x15, 0x3B, 0x07, 0x07, 0x07, 0x22, 0x1E, 0x1E, 0x30, 0x21, 0x3A, 0x12, 0x12, 0x38, 0x17, 0x17, 0x17, 0x3B, 0x07, 0x07, 0x18, 0x22, 0x22, 0x06, 0x06, 0x3A, 0x35, 0x36, 0x36, 0x15, 0x3B, 0x3B, 0x3B, 0x27, 0x07, 0x07, 0x2A, 0x22, 0x06, 0x06, 0x21, 0x3A, 0x35, 0x36, 0x3D, 0x15, 0x3B, 0x3B, 0x3B, 0x27, 0x07, 0x07, 0x2A, 0x22, 0x22, 0x33, 0x33, 0x35, 0x36, 0x38, 0x38, 0x39, 0x27, 0x27, 0x27, 0x07, 0x2A, 0x2A, 0x19, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x04, 0x04, 0x04, 0x05, 0x17, 0x17, 0x27, 0x07, 0x07, 0x07, 0x2A, 0x19, 0x19, 0x16, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x05, 0x05, 0x05, 0x05, 0x39, 0x39, 0x27, 0x18, 0x18, 0x18, 0x2A, 0x16, 0x16, 0x1C, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x29, 0x29, 0x29, 0x29, 0x27, 0x27, 0x07, 0x2A, 0x2A, 0x2A, 0x19, 0x1C, 0x1C, 0x1C, 0x1F, 0x1F, 0x29, 0x29, 0x29, 0x29, 0x27, 0x27, 0x18, 0x19, 0x19, 0x19, 0x16, 0x1C, 0x1C, 0x22, 0x1F, 0x1F, 0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x1C, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x1F, 0x13, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x08, 0x09, 0x0B, 0x2F, 0x20, 0x32, 0x12, 0x12, 0x14, 0x15, 0x15, 0x15, 0x27, 0x3B, 0x22, 0x1A, 0x1A, 0x1B, 0x1D, 0x1E, 0x21, 0x32, 0x12, 0x12, 0x14, 0x39, 0x39, 0x39, 0x3B, 0x3B, 0x22, 0x1B, 0x1B, 0x0B, 0x0C, 0x30, 0x32, 0x3A, 0x3D, 0x3D, 0x38, 0x39, 0x39, 0x39, 0x3B, 0x27, 0x22, 0x2D, 0x2D, 0x0C, 0x1E, 0x20, 0x02, 0x02, 0x3D, 0x26, 0x26, 0x26, 0x39, 0x00, 0x3B, 0x27, 0x22, 0x3F, 0x3F, 0x03, 0x20, 0x3A, 0x12, 0x12, 0x14, 0x15, 0x15, 0x15, 0x3B, 0x27, 0x27, 0x07, 0x1F, 0x1F, 0x03, 0x03, 0x21, 0x3A, 0x12, 0x12, 0x14, 0x15, 0x15, 0x15, 0x3B, 0x07, 0x07, 0x07, 0x1F, 0x06, 0x06, 0x33, 0x33, 0x35, 0x36, 0x36, 0x26, 0x39, 0x39, 0x39, 0x27, 0x07, 0x07, 0x2A, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x33, 0x35, 0x35, 0x36, 0x38, 0x38, 0x39, 0x3B, 0x3B, 0x3B, 0x07, 0x18, 0x18, 0x19, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x04, 0x04, 0x04, 0x36, 0x15, 0x15, 0x39, 0x27, 0x27, 0x27, 0x07, 0x2A, 0x2A, 0x16, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x1F, 0x05, 0x05, 0x05, 0x05, 0x17, 0x17, 0x3B, 0x07, 0x07, 0x07, 0x2A, 0x16, 0x16, 0x1C, 0x1F, 0x1F, 0x04, 0x04, 0x04, 0x05, 0x17, 0x17, 0x27, 0x18, 0x18, 0x18, 0x19, 0x1C, 0x1C, 0x22, 0x1F, 0x1F, 0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x0A, 0x1C, 0x22, 0x22, 0x22, 0x1F, 0x1F, 0x1F, 0x1F, 0x13, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x10, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x00, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x25, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x10, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x10, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x10, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x10, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x10, 0x10, 0x10, 0x10, 0x10, 0x25, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x10, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x25, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x13, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x13, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x3C, 0x3C, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0D, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    var AC_SPEC_CUMFREQ = [[0, 1, 2, 177, 225, 226, 227, 336, 372, 543, 652, 699, 719, 768, 804, 824, 834], [0, 18, 44, 61, 71, 98, 135, 159, 175, 197, 229, 251, 265, 282, 308, 328, 341], [0, 71, 163, 212, 237, 318, 420, 481, 514, 556, 613, 652, 675, 697, 727, 749, 764], [0, 160, 290, 336, 354, 475, 598, 653, 677, 722, 777, 808, 823, 842, 866, 881, 890], [0, 71, 144, 177, 195, 266, 342, 385, 411, 445, 489, 519, 539, 559, 586, 607, 622], [0, 48, 108, 140, 159, 217, 285, 327, 354, 385, 427, 457, 478, 497, 524, 545, 561], [0, 138, 247, 290, 308, 419, 531, 584, 609, 655, 710, 742, 759, 780, 807, 825, 836], [0, 16, 40, 62, 79, 103, 139, 170, 195, 215, 245, 270, 290, 305, 327, 346, 362], [0, 579, 729, 741, 743, 897, 970, 980, 982, 996, 1007, 1010, 1011, 1014, 1017, 1018, 1019], [0, 398, 582, 607, 612, 788, 902, 925, 931, 956, 979, 987, 990, 996, 1002, 1005, 1007], [0, 13, 34, 52, 63, 83, 112, 134, 149, 163, 183, 199, 211, 221, 235, 247, 257], [0, 281, 464, 501, 510, 681, 820, 857, 867, 902, 938, 953, 959, 968, 978, 984, 987], [0, 198, 362, 408, 421, 575, 722, 773, 789, 832, 881, 905, 915, 928, 944, 954, 959], [0, 1, 2, 95, 139, 140, 141, 213, 251, 337, 407, 450, 475, 515, 551, 576, 592], [0, 133, 274, 338, 366, 483, 605, 664, 691, 730, 778, 807, 822, 837, 857, 870, 878], [0, 128, 253, 302, 320, 443, 577, 636, 659, 708, 767, 799, 814, 833, 857, 872, 881], [0, 1, 2, 25, 42, 43, 44, 67, 85, 105, 126, 144, 159, 174, 191, 205, 217], [0, 70, 166, 229, 267, 356, 468, 533, 569, 606, 653, 685, 705, 722, 745, 762, 774], [0, 55, 130, 175, 200, 268, 358, 416, 449, 488, 542, 581, 606, 628, 659, 683, 699], [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31], [0, 34, 85, 123, 147, 196, 265, 317, 352, 386, 433, 470, 497, 518, 549, 574, 593], [0, 30, 73, 105, 127, 170, 229, 274, 305, 335, 377, 411, 436, 455, 483, 506, 524], [0, 9, 24, 38, 51, 65, 87, 108, 126, 139, 159, 177, 193, 204, 221, 236, 250], [0, 30, 74, 105, 125, 166, 224, 266, 294, 322, 361, 391, 413, 431, 457, 478, 494], [0, 15, 38, 58, 73, 95, 128, 156, 178, 196, 222, 245, 263, 276, 296, 314, 329], [0, 11, 28, 44, 57, 74, 100, 123, 142, 157, 179, 199, 216, 228, 246, 262, 276], [0, 448, 619, 639, 643, 821, 926, 944, 948, 971, 991, 998, 1000, 1005, 1010, 1012, 1013], [0, 332, 520, 549, 555, 741, 874, 903, 910, 940, 970, 981, 985, 991, 998, 1002, 1004], [0, 8, 21, 34, 45, 58, 78, 96, 112, 124, 141, 157, 170, 180, 194, 207, 219], [0, 239, 415, 457, 468, 631, 776, 820, 833, 872, 914, 933, 940, 951, 964, 971, 975], [0, 165, 310, 359, 375, 513, 652, 707, 727, 774, 828, 856, 868, 884, 904, 916, 923], [0, 3, 8, 13, 18, 23, 30, 37, 44, 48, 55, 62, 68, 72, 78, 84, 90], [0, 115, 237, 289, 311, 422, 547, 608, 635, 680, 737, 771, 788, 807, 832, 849, 859], [0, 107, 221, 272, 293, 399, 521, 582, 610, 656, 714, 749, 767, 787, 813, 831, 842], [0, 6, 16, 26, 35, 45, 60, 75, 89, 98, 112, 125, 137, 145, 157, 168, 178], [0, 72, 160, 210, 236, 320, 422, 482, 514, 555, 608, 644, 665, 685, 712, 732, 745], [0, 45, 108, 153, 183, 244, 327, 385, 421, 455, 502, 536, 559, 578, 605, 626, 641], [0, 1, 2, 9, 16, 17, 18, 26, 34, 40, 48, 55, 62, 68, 75, 82, 88], [0, 29, 73, 108, 132, 174, 236, 284, 318, 348, 391, 426, 452, 471, 500, 524, 543], [0, 20, 51, 76, 93, 123, 166, 200, 225, 247, 279, 305, 326, 342, 365, 385, 401], [0, 742, 845, 850, 851, 959, 997, 1001, 1002, 1009, 1014, 1016, 1017, 1019, 1020, 1021, 1022], [0, 42, 94, 121, 137, 186, 244, 280, 303, 330, 366, 392, 410, 427, 451, 470, 484], [0, 13, 33, 51, 66, 85, 114, 140, 161, 178, 203, 225, 243, 256, 275, 292, 307], [0, 501, 670, 689, 693, 848, 936, 952, 956, 975, 991, 997, 999, 1004, 1008, 1010, 1011], [0, 445, 581, 603, 609, 767, 865, 888, 895, 926, 954, 964, 968, 977, 986, 991, 993], [0, 285, 442, 479, 489, 650, 779, 818, 830, 870, 912, 930, 937, 949, 963, 971, 975], [0, 349, 528, 561, 569, 731, 852, 883, 892, 923, 953, 965, 970, 978, 987, 992, 994], [0, 199, 355, 402, 417, 563, 700, 750, 767, 811, 860, 884, 894, 909, 926, 936, 942], [0, 141, 275, 325, 343, 471, 606, 664, 686, 734, 791, 822, 836, 854, 877, 891, 899], [0, 243, 437, 493, 510, 649, 775, 820, 836, 869, 905, 923, 931, 941, 953, 960, 964], [0, 91, 197, 248, 271, 370, 487, 550, 580, 625, 684, 721, 741, 761, 788, 807, 819], [0, 107, 201, 242, 262, 354, 451, 503, 531, 573, 626, 660, 680, 701, 730, 751, 765], [0, 168, 339, 407, 432, 553, 676, 731, 755, 789, 830, 854, 866, 879, 895, 906, 912], [0, 67, 147, 191, 214, 290, 384, 441, 472, 513, 567, 604, 627, 648, 678, 700, 715], [0, 46, 109, 148, 171, 229, 307, 359, 391, 427, 476, 513, 537, 558, 588, 612, 629], [0, 848, 918, 920, 921, 996, 1012, 1013, 1014, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023], [0, 36, 88, 123, 145, 193, 260, 308, 340, 372, 417, 452, 476, 496, 525, 548, 565], [0, 24, 61, 90, 110, 145, 196, 237, 266, 292, 330, 361, 385, 403, 430, 453, 471], [0, 85, 182, 230, 253, 344, 454, 515, 545, 590, 648, 685, 706, 727, 756, 776, 789], [0, 22, 55, 82, 102, 135, 183, 222, 252, 278, 315, 345, 368, 385, 410, 431, 448], [0, 1, 2, 56, 89, 90, 91, 140, 172, 221, 268, 303, 328, 358, 388, 412, 430], [0, 45, 109, 152, 177, 239, 320, 376, 411, 448, 499, 537, 563, 585, 616, 640, 658], [0, 247, 395, 433, 445, 599, 729, 771, 785, 829, 875, 896, 905, 920, 937, 946, 951], [0, 231, 367, 408, 423, 557, 676, 723, 742, 786, 835, 860, 872, 889, 909, 921, 928]];
    var AC_SPEC_FREQ = [[1, 1, 175, 48, 1, 1, 109, 36, 171, 109, 47, 20, 49, 36, 20, 10, 190], [18, 26, 17, 10, 27, 37, 24, 16, 22, 32, 22, 14, 17, 26, 20, 13, 683], [71, 92, 49, 25, 81, 102, 61, 33, 42, 57, 39, 23, 22, 30, 22, 15, 260], [160, 130, 46, 18, 121, 123, 55, 24, 45, 55, 31, 15, 19, 24, 15, 9, 134], [71, 73, 33, 18, 71, 76, 43, 26, 34, 44, 30, 20, 20, 27, 21, 15, 402], [48, 60, 32, 19, 58, 68, 42, 27, 31, 42, 30, 21, 19, 27, 21, 16, 463], [138, 109, 43, 18, 111, 112, 53, 25, 46, 55, 32, 17, 21, 27, 18, 11, 188], [16, 24, 22, 17, 24, 36, 31, 25, 20, 30, 25, 20, 15, 22, 19, 16, 662], [579, 150, 12, 2, 154, 73, 10, 2, 14, 11, 3, 1, 3, 3, 1, 1, 5], [398, 184, 25, 5, 176, 114, 23, 6, 25, 23, 8, 3, 6, 6, 3, 2, 17], [13, 21, 18, 11, 20, 29, 22, 15, 14, 20, 16, 12, 10, 14, 12, 10, 767], [281, 183, 37, 9, 171, 139, 37, 10, 35, 36, 15, 6, 9, 10, 6, 3, 37], [198, 164, 46, 13, 154, 147, 51, 16, 43, 49, 24, 10, 13, 16, 10, 5, 65], [1, 1, 93, 44, 1, 1, 72, 38, 86, 70, 43, 25, 40, 36, 25, 16, 432], [133, 141, 64, 28, 117, 122, 59, 27, 39, 48, 29, 15, 15, 20, 13, 8, 146], [128, 125, 49, 18, 123, 134, 59, 23, 49, 59, 32, 15, 19, 24, 15, 9, 143], [1, 1, 23, 17, 1, 1, 23, 18, 20, 21, 18, 15, 15, 17, 14, 12, 807], [70, 96, 63, 38, 89, 112, 65, 36, 37, 47, 32, 20, 17, 23, 17, 12, 250], [55, 75, 45, 25, 68, 90, 58, 33, 39, 54, 39, 25, 22, 31, 24, 16, 325], [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 993], [34, 51, 38, 24, 49, 69, 52, 35, 34, 47, 37, 27, 21, 31, 25, 19, 431], [30, 43, 32, 22, 43, 59, 45, 31, 30, 42, 34, 25, 19, 28, 23, 18, 500], [9, 15, 14, 13, 14, 22, 21, 18, 13, 20, 18, 16, 11, 17, 15, 14, 774], [30, 44, 31, 20, 41, 58, 42, 28, 28, 39, 30, 22, 18, 26, 21, 16, 530], [15, 23, 20, 15, 22, 33, 28, 22, 18, 26, 23, 18, 13, 20, 18, 15, 695], [11, 17, 16, 13, 17, 26, 23, 19, 15, 22, 20, 17, 12, 18, 16, 14, 748], [448, 171, 20, 4, 178, 105, 18, 4, 23, 20, 7, 2, 5, 5, 2, 1, 11], [332, 188, 29, 6, 186, 133, 29, 7, 30, 30, 11, 4, 6, 7, 4, 2, 20], [8, 13, 13, 11, 13, 20, 18, 16, 12, 17, 16, 13, 10, 14, 13, 12, 805], [239, 176, 42, 11, 163, 145, 44, 13, 39, 42, 19, 7, 11, 13, 7, 4, 49], [165, 145, 49, 16, 138, 139, 55, 20, 47, 54, 28, 12, 16, 20, 12, 7, 101], [3, 5, 5, 5, 5, 7, 7, 7, 4, 7, 7, 6, 4, 6, 6, 6, 934], [115, 122, 52, 22, 111, 125, 61, 27, 45, 57, 34, 17, 19, 25, 17, 10, 165], [107, 114, 51, 21, 106, 122, 61, 28, 46, 58, 35, 18, 20, 26, 18, 11, 182], [6, 10, 10, 9, 10, 15, 15, 14, 9, 14, 13, 12, 8, 12, 11, 10, 846], [72, 88, 50, 26, 84, 102, 60, 32, 41, 53, 36, 21, 20, 27, 20, 13, 279], [45, 63, 45, 30, 61, 83, 58, 36, 34, 47, 34, 23, 19, 27, 21, 15, 383], [1, 1, 7, 7, 1, 1, 8, 8, 6, 8, 7, 7, 6, 7, 7, 6, 936], [29, 44, 35, 24, 42, 62, 48, 34, 30, 43, 35, 26, 19, 29, 24, 19, 481], [20, 31, 25, 17, 30, 43, 34, 25, 22, 32, 26, 21, 16, 23, 20, 16, 623], [742, 103, 5, 1, 108, 38, 4, 1, 7, 5, 2, 1, 2, 1, 1, 1, 2], [42, 52, 27, 16, 49, 58, 36, 23, 27, 36, 26, 18, 17, 24, 19, 14, 540], [13, 20, 18, 15, 19, 29, 26, 21, 17, 25, 22, 18, 13, 19, 17, 15, 717], [501, 169, 19, 4, 155, 88, 16, 4, 19, 16, 6, 2, 5, 4, 2, 1, 13], [445, 136, 22, 6, 158, 98, 23, 7, 31, 28, 10, 4, 9, 9, 5, 2, 31], [285, 157, 37, 10, 161, 129, 39, 12, 40, 42, 18, 7, 12, 14, 8, 4, 49], [349, 179, 33, 8, 162, 121, 31, 9, 31, 30, 12, 5, 8, 9, 5, 2, 30], [199, 156, 47, 15, 146, 137, 50, 17, 44, 49, 24, 10, 15, 17, 10, 6, 82], [141, 134, 50, 18, 128, 135, 58, 22, 48, 57, 31, 14, 18, 23, 14, 8, 125], [243, 194, 56, 17, 139, 126, 45, 16, 33, 36, 18, 8, 10, 12, 7, 4, 60], [91, 106, 51, 23, 99, 117, 63, 30, 45, 59, 37, 20, 20, 27, 19, 12, 205], [107, 94, 41, 20, 92, 97, 52, 28, 42, 53, 34, 20, 21, 29, 21, 14, 259], [168, 171, 68, 25, 121, 123, 55, 24, 34, 41, 24, 12, 13, 16, 11, 6, 112], [67, 80, 44, 23, 76, 94, 57, 31, 41, 54, 37, 23, 21, 30, 22, 15, 309], [46, 63, 39, 23, 58, 78, 52, 32, 36, 49, 37, 24, 21, 30, 24, 17, 395], [848, 70, 2, 1, 75, 16, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1], [36, 52, 35, 22, 48, 67, 48, 32, 32, 45, 35, 24, 20, 29, 23, 17, 459], [24, 37, 29, 20, 35, 51, 41, 29, 26, 38, 31, 24, 18, 27, 23, 18, 553], [85, 97, 48, 23, 91, 110, 61, 30, 45, 58, 37, 21, 21, 29, 20, 13, 235], [22, 33, 27, 20, 33, 48, 39, 30, 26, 37, 30, 23, 17, 25, 21, 17, 576], [1, 1, 54, 33, 1, 1, 49, 32, 49, 47, 35, 25, 30, 30, 24, 18, 594], [45, 64, 43, 25, 62, 81, 56, 35, 37, 51, 38, 26, 22, 31, 24, 18, 366], [247, 148, 38, 12, 154, 130, 42, 14, 44, 46, 21, 9, 15, 17, 9, 5, 73], [231, 136, 41, 15, 134, 119, 47, 19, 44, 49, 25, 12, 17, 20, 12, 7, 96]];
    var AC_SPEC_BITS = [[20480, 20480, 5220, 9042, 20480, 20480, 6619, 9892, 5289, 6619, 9105, 11629, 8982, 9892, 11629, 13677, 4977], [11940, 10854, 12109, 13677, 10742, 9812, 11090, 12288, 11348, 10240, 11348, 12683, 12109, 10854, 11629, 12902, 1197], [7886, 7120, 8982, 10970, 7496, 6815, 8334, 10150, 9437, 8535, 9656, 11216, 11348, 10431, 11348, 12479, 4051], [5485, 6099, 9168, 11940, 6311, 6262, 8640, 11090, 9233, 8640, 10334, 12479, 11781, 11090, 12479, 13988, 6009], [7886, 7804, 10150, 11940, 7886, 7685, 9368, 10854, 10061, 9300, 10431, 11629, 11629, 10742, 11485, 12479, 2763], [9042, 8383, 10240, 11781, 8483, 8013, 9437, 10742, 10334, 9437, 10431, 11485, 11781, 10742, 11485, 12288, 2346], [5922, 6619, 9368, 11940, 6566, 6539, 8750, 10970, 9168, 8640, 10240, 12109, 11485, 10742, 11940, 13396, 5009], [12288, 11090, 11348, 12109, 11090, 9892, 10334, 10970, 11629, 10431, 10970, 11629, 12479, 11348, 11781, 12288, 1289], [1685, 5676, 13138, 18432, 5598, 7804, 13677, 18432, 12683, 13396, 17234, 20480, 17234, 17234, 20480, 20480, 15725], [2793, 5072, 10970, 15725, 5204, 6487, 11216, 15186, 10970, 11216, 14336, 17234, 15186, 15186, 17234, 18432, 12109], [12902, 11485, 11940, 13396, 11629, 10531, 11348, 12479, 12683, 11629, 12288, 13138, 13677, 12683, 13138, 13677, 854], [3821, 5088, 9812, 13988, 5289, 5901, 9812, 13677, 9976, 9892, 12479, 15186, 13988, 13677, 15186, 17234, 9812], [4856, 5412, 9168, 12902, 5598, 5736, 8863, 12288, 9368, 8982, 11090, 13677, 12902, 12288, 13677, 15725, 8147], [20480, 20480, 7088, 9300, 20480, 20480, 7844, 9733, 7320, 7928, 9368, 10970, 9581, 9892, 10970, 12288, 2550], [6031, 5859, 8192, 10635, 6410, 6286, 8433, 10742, 9656, 9042, 10531, 12479, 12479, 11629, 12902, 14336, 5756], [6144, 6215, 8982, 11940, 6262, 6009, 8433, 11216, 8982, 8433, 10240, 12479, 11781, 11090, 12479, 13988, 5817], [20480, 20480, 11216, 12109, 20480, 20480, 11216, 11940, 11629, 11485, 11940, 12479, 12479, 12109, 12683, 13138, 704], [7928, 6994, 8239, 9733, 7218, 6539, 8147, 9892, 9812, 9105, 10240, 11629, 12109, 11216, 12109, 13138, 4167], [8640, 7724, 9233, 10970, 8013, 7185, 8483, 10150, 9656, 8694, 9656, 10970, 11348, 10334, 11090, 12288, 3391], [20480, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 18432, 91], [10061, 8863, 9733, 11090, 8982, 7970, 8806, 9976, 10061, 9105, 9812, 10742, 11485, 10334, 10970, 11781, 2557], [10431, 9368, 10240, 11348, 9368, 8433, 9233, 10334, 10431, 9437, 10061, 10970, 11781, 10635, 11216, 11940, 2119], [13988, 12479, 12683, 12902, 12683, 11348, 11485, 11940, 12902, 11629, 11940, 12288, 13396, 12109, 12479, 12683, 828], [10431, 9300, 10334, 11629, 9508, 8483, 9437, 10635, 10635, 9656, 10431, 11348, 11940, 10854, 11485, 12288, 1946], [12479, 11216, 11629, 12479, 11348, 10150, 10635, 11348, 11940, 10854, 11216, 11940, 12902, 11629, 11940, 12479, 1146], [13396, 12109, 12288, 12902, 12109, 10854, 11216, 11781, 12479, 11348, 11629, 12109, 13138, 11940, 12288, 12683, 928], [2443, 5289, 11629, 16384, 5170, 6730, 11940, 16384, 11216, 11629, 14731, 18432, 15725, 15725, 18432, 20480, 13396], [3328, 5009, 10531, 15186, 5040, 6031, 10531, 14731, 10431, 10431, 13396, 16384, 15186, 14731, 16384, 18432, 11629], [14336, 12902, 12902, 13396, 12902, 11629, 11940, 12288, 13138, 12109, 12288, 12902, 13677, 12683, 12902, 13138, 711], [4300, 5204, 9437, 13396, 5430, 5776, 9300, 12902, 9656, 9437, 11781, 14731, 13396, 12902, 14731, 16384, 8982], [5394, 5776, 8982, 12288, 5922, 5901, 8640, 11629, 9105, 8694, 10635, 13138, 12288, 11629, 13138, 14731, 6844], [17234, 15725, 15725, 15725, 15725, 14731, 14731, 14731, 16384, 14731, 14731, 15186, 16384, 15186, 15186, 15186, 272], [6461, 6286, 8806, 11348, 6566, 6215, 8334, 10742, 9233, 8535, 10061, 12109, 11781, 10970, 12109, 13677, 5394], [6674, 6487, 8863, 11485, 6702, 6286, 8334, 10635, 9168, 8483, 9976, 11940, 11629, 10854, 11940, 13396, 5105], [15186, 13677, 13677, 13988, 13677, 12479, 12479, 12683, 13988, 12683, 12902, 13138, 14336, 13138, 13396, 13677, 565], [7844, 7252, 8922, 10854, 7389, 6815, 8383, 10240, 9508, 8750, 9892, 11485, 11629, 10742, 11629, 12902, 3842], [9233, 8239, 9233, 10431, 8334, 7424, 8483, 9892, 10061, 9105, 10061, 11216, 11781, 10742, 11485, 12479, 2906], [20480, 20480, 14731, 14731, 20480, 20480, 14336, 14336, 15186, 14336, 14731, 14731, 15186, 14731, 14731, 15186, 266], [10531, 9300, 9976, 11090, 9437, 8286, 9042, 10061, 10431, 9368, 9976, 10854, 11781, 10531, 11090, 11781, 2233], [11629, 10334, 10970, 12109, 10431, 9368, 10061, 10970, 11348, 10240, 10854, 11485, 12288, 11216, 11629, 12288, 1469], [952, 6787, 15725, 20480, 6646, 9733, 16384, 20480, 14731, 15725, 18432, 20480, 18432, 20480, 20480, 20480, 18432], [9437, 8806, 10742, 12288, 8982, 8483, 9892, 11216, 10742, 9892, 10854, 11940, 12109, 11090, 11781, 12683, 1891], [12902, 11629, 11940, 12479, 11781, 10531, 10854, 11485, 12109, 10970, 11348, 11940, 12902, 11781, 12109, 12479, 1054], [2113, 5323, 11781, 16384, 5579, 7252, 12288, 16384, 11781, 12288, 15186, 18432, 15725, 16384, 18432, 20480, 12902], [2463, 5965, 11348, 15186, 5522, 6934, 11216, 14731, 10334, 10635, 13677, 16384, 13988, 13988, 15725, 18432, 10334], [3779, 5541, 9812, 13677, 5467, 6122, 9656, 13138, 9581, 9437, 11940, 14731, 13138, 12683, 14336, 16384, 8982], [3181, 5154, 10150, 14336, 5448, 6311, 10334, 13988, 10334, 10431, 13138, 15725, 14336, 13988, 15725, 18432, 10431], [4841, 5560, 9105, 12479, 5756, 5944, 8922, 12109, 9300, 8982, 11090, 13677, 12479, 12109, 13677, 15186, 7460], [5859, 6009, 8922, 11940, 6144, 5987, 8483, 11348, 9042, 8535, 10334, 12683, 11940, 11216, 12683, 14336, 6215], [4250, 4916, 8587, 12109, 5901, 6191, 9233, 12288, 10150, 9892, 11940, 14336, 13677, 13138, 14731, 16384, 8383], [7153, 6702, 8863, 11216, 6904, 6410, 8239, 10431, 9233, 8433, 9812, 11629, 11629, 10742, 11781, 13138, 4753], [6674, 7057, 9508, 11629, 7120, 6964, 8806, 10635, 9437, 8750, 10061, 11629, 11485, 10531, 11485, 12683, 4062], [5341, 5289, 8013, 10970, 6311, 6262, 8640, 11090, 10061, 9508, 11090, 13138, 12902, 12288, 13396, 15186, 6539], [8057, 7533, 9300, 11216, 7685, 7057, 8535, 10334, 9508, 8694, 9812, 11216, 11485, 10431, 11348, 12479, 3541], [9168, 8239, 9656, 11216, 8483, 7608, 8806, 10240, 9892, 8982, 9812, 11090, 11485, 10431, 11090, 12109, 2815], [558, 7928, 18432, 20480, 7724, 12288, 20480, 20480, 18432, 20480, 20480, 20480, 20480, 20480, 20480, 20480, 20480], [9892, 8806, 9976, 11348, 9042, 8057, 9042, 10240, 10240, 9233, 9976, 11090, 11629, 10531, 11216, 12109, 2371], [11090, 9812, 10531, 11629, 9976, 8863, 9508, 10531, 10854, 9733, 10334, 11090, 11940, 10742, 11216, 11940, 1821], [7354, 6964, 9042, 11216, 7153, 6592, 8334, 10431, 9233, 8483, 9812, 11485, 11485, 10531, 11629, 12902, 4349], [11348, 10150, 10742, 11629, 10150, 9042, 9656, 10431, 10854, 9812, 10431, 11216, 12109, 10970, 11485, 12109, 1700], [20480, 20480, 8694, 10150, 20480, 20480, 8982, 10240, 8982, 9105, 9976, 10970, 10431, 10431, 11090, 11940, 1610], [9233, 8192, 9368, 10970, 8286, 7496, 8587, 9976, 9812, 8863, 9733, 10854, 11348, 10334, 11090, 11940, 3040], [4202, 5716, 9733, 13138, 5598, 6099, 9437, 12683, 9300, 9168, 11485, 13988, 12479, 12109, 13988, 15725, 7804], [4400, 5965, 9508, 12479, 6009, 6360, 9105, 11781, 9300, 8982, 10970, 13138, 12109, 11629, 13138, 14731, 6994]];
    module.exports = {
      "AC_SPEC_LOOKUP": AC_SPEC_LOOKUP,
      "AC_SPEC_CUMFREQ": AC_SPEC_CUMFREQ,
      "AC_SPEC_FREQ": AC_SPEC_FREQ,
      "AC_SPEC_BITS": AC_SPEC_BITS
    };
  },
  "lc3/tables/bw": function lc3TablesBw(module, require) {
    var NBITSBW_TBL = [[0, 1, 2, 2, 3, 3], [0, 1, 2, 2, 3, 3]];
    module.exports = {
      "NBITSBW_TBL": NBITSBW_TBL
    };
  },
  "lc3/tables/i": function lc3TablesI(module, require) {
    var Lc3TblI10 = require("./i10");

    var Lc3TblI75 = require("./i75");

    var I_8000_10 = Lc3TblI10.I_8000_10;
    var I_16000_10 = Lc3TblI10.I_16000_10;
    var I_24000_10 = Lc3TblI10.I_24000_10;
    var I_32000_10 = Lc3TblI10.I_32000_10;
    var I_48000_10 = Lc3TblI10.I_48000_10;
    var I_8000_75 = Lc3TblI75.I_8000_75;
    var I_16000_75 = Lc3TblI75.I_16000_75;
    var I_24000_75 = Lc3TblI75.I_24000_75;
    var I_32000_75 = Lc3TblI75.I_32000_75;
    var I_48000_75 = Lc3TblI75.I_48000_75;
    var I_TBL = [[I_8000_10, I_16000_10, I_24000_10, I_32000_10, I_48000_10, I_48000_10], [I_8000_75, I_16000_75, I_24000_75, I_32000_75, I_48000_75, I_48000_75]];
    module.exports = {
      "I_TBL": I_TBL
    };
  },
  "lc3/tables/i10": function lc3TablesI10(module, require) {
    var I_8000_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 55, 57, 59, 61, 63, 65, 67, 69, 71, 73, 75, 77, 80];
    var I_16000_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 55, 58, 61, 64, 67, 70, 73, 76, 80, 84, 88, 92, 96, 101, 106, 111, 116, 121, 127, 133, 139, 146, 153, 160];
    var I_24000_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 46, 49, 52, 55, 58, 61, 64, 68, 72, 76, 80, 85, 90, 95, 100, 106, 112, 118, 125, 132, 139, 147, 155, 164, 173, 183, 193, 204, 215, 227, 240];
    var I_32000_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 41, 44, 47, 50, 53, 56, 60, 64, 68, 72, 76, 81, 86, 91, 97, 103, 109, 116, 123, 131, 139, 148, 157, 166, 176, 187, 199, 211, 224, 238, 252, 268, 284, 302, 320];
    var I_48000_10 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 39, 42, 45, 48, 51, 55, 59, 63, 67, 71, 76, 81, 86, 92, 98, 105, 112, 119, 127, 135, 144, 154, 164, 175, 186, 198, 211, 225, 240, 256, 273, 291, 310, 330, 352, 375, 400];
    module.exports = {
      "I_8000_10": I_8000_10,
      "I_16000_10": I_16000_10,
      "I_24000_10": I_24000_10,
      "I_32000_10": I_32000_10,
      "I_48000_10": I_48000_10
    };
  },
  "lc3/tables/i75": function lc3TablesI75(module, require) {
    var I_8000_75 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60];
    var I_16000_75 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 65, 68, 71, 74, 77, 80, 83, 86, 90, 94, 98, 102, 106, 110, 115, 120];
    var I_24000_75 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 52, 55, 58, 61, 64, 67, 70, 74, 78, 82, 86, 90, 95, 100, 105, 110, 115, 121, 127, 134, 141, 148, 155, 163, 171, 180];
    var I_32000_75 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 45, 48, 51, 54, 57, 60, 63, 67, 71, 75, 79, 84, 89, 94, 99, 105, 111, 117, 124, 131, 138, 146, 154, 163, 172, 182, 192, 203, 215, 227, 240];
    var I_48000_75 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 43, 46, 49, 52, 55, 59, 63, 67, 71, 75, 80, 85, 90, 96, 102, 108, 115, 122, 129, 137, 146, 155, 165, 175, 186, 197, 209, 222, 236, 251, 266, 283, 300];
    module.exports = {
      "I_8000_75": I_8000_75,
      "I_16000_75": I_16000_75,
      "I_24000_75": I_24000_75,
      "I_32000_75": I_32000_75,
      "I_48000_75": I_48000_75
    };
  },
  "lc3/tables/ltpf": function lc3TablesLtpf(module, require) {
    var TAB_RESAMP_FILTER = [-2.043055832879108e-05, -4.463458936757081e-05, -7.163663994481459e-05, -1.001011132655914e-04, -1.283728480660395e-04, -1.545438297704662e-04, -1.765445671257668e-04, -1.922569599584802e-04, -1.996438192500382e-04, -1.968886856400547e-04, -1.825383318834690e-04, -1.556394266046803e-04, -1.158603651792638e-04, -6.358930335348977e-05, +2.810064795067786e-19, +7.292180213001337e-05, +1.523970757644272e-04, +2.349207769898906e-04, +3.163786496265269e-04, +3.922117380894736e-04, +4.576238491064392e-04, +5.078242936704864e-04, +5.382955231045915e-04, +5.450729176175875e-04, +5.250221548270982e-04, +4.760984242947349e-04, +3.975713799264791e-04, +2.902002172907180e-04, +1.563446669975615e-04, -5.818801416923580e-19, -1.732527127898052e-04, -3.563859653300760e-04, -5.411552308801147e-04, -7.184140229675020e-04, -8.785052315963854e-04, -1.011714513697282e-03, -1.108767055632304e-03, -1.161345220483996e-03, -1.162601694464620e-03, -1.107640974148221e-03, -9.939415631563015e-04, -8.216921898513225e-04, -5.940177657925908e-04, -3.170746535382728e-04, +9.746950818779534e-19, +3.452937604228947e-04, +7.044808705458705e-04, +1.061334465662964e-03, +1.398374734488549e-03, +1.697630799350524e-03, +1.941486748731660e-03, +2.113575906669355e-03, +2.199682452179964e-03, +2.188606246517629e-03, +2.072945458973295e-03, +1.849752491313908e-03, +1.521021876908738e-03, +1.093974255016849e-03, +5.811080624426164e-04, -1.422482656398999e-18, -6.271537303228204e-04, -1.274251404913447e-03, -1.912238389850182e-03, -2.510269249380764e-03, -3.037038298629825e-03, -3.462226871101535e-03, -3.758006719596473e-03, -3.900532466948409e-03, -3.871352309895838e-03, -3.658665583679722e-03, -3.258358512646846e-03, -2.674755551508349e-03, -1.921033054368456e-03, -1.019254326838640e-03, +1.869623690895593e-18, +1.098415446732263e-03, +2.231131973532823e-03, +3.348309272768835e-03, +4.397022774386510e-03, +5.323426722644900e-03, +6.075105310368700e-03, +6.603520247552113e-03, +6.866453987193027e-03, +6.830342695906946e-03, +6.472392343549424e-03, +5.782375213956374e-03, +4.764012726389739e-03, +3.435863514113467e-03, +1.831652835406657e-03, -2.251898372838663e-18, -1.996476188279370e-03, -4.082668858919100e-03, -6.173080374929424e-03, -8.174448945974208e-03, -9.988823864332691e-03, -1.151698705819990e-02, -1.266210056063963e-02, -1.333344579518481e-02, -1.345011199343934e-02, -1.294448809639154e-02, -1.176541543002924e-02, -9.880867320401294e-03, -7.280036402392082e-03, -3.974730209151807e-03, +2.509617777250391e-18, +4.586044219717467e-03, +9.703248998383679e-03, +1.525124770818010e-02, +2.111205854013017e-02, +2.715337236094137e-02, +3.323242450843114e-02, +3.920032029020130e-02, +4.490666443426786e-02, +5.020433088017846e-02, +5.495420172681558e-02, +5.902970324375908e-02, +6.232097270672976e-02, +6.473850225260731e-02, +6.621612450840858e-02, +6.671322871619612e-02, +6.621612450840858e-02, +6.473850225260731e-02, +6.232097270672976e-02, +5.902970324375908e-02, +5.495420172681558e-02, +5.020433088017846e-02, +4.490666443426786e-02, +3.920032029020130e-02, +3.323242450843114e-02, +2.715337236094137e-02, +2.111205854013017e-02, +1.525124770818010e-02, +9.703248998383679e-03, +4.586044219717467e-03, +2.509617777250391e-18, -3.974730209151807e-03, -7.280036402392082e-03, -9.880867320401294e-03, -1.176541543002924e-02, -1.294448809639154e-02, -1.345011199343934e-02, -1.333344579518481e-02, -1.266210056063963e-02, -1.151698705819990e-02, -9.988823864332691e-03, -8.174448945974208e-03, -6.173080374929424e-03, -4.082668858919100e-03, -1.996476188279370e-03, -2.251898372838663e-18, +1.831652835406657e-03, +3.435863514113467e-03, +4.764012726389739e-03, +5.782375213956374e-03, +6.472392343549424e-03, +6.830342695906946e-03, +6.866453987193027e-03, +6.603520247552113e-03, +6.075105310368700e-03, +5.323426722644900e-03, +4.397022774386510e-03, +3.348309272768835e-03, +2.231131973532823e-03, +1.098415446732263e-03, +1.869623690895593e-18, -1.019254326838640e-03, -1.921033054368456e-03, -2.674755551508349e-03, -3.258358512646846e-03, -3.658665583679722e-03, -3.871352309895838e-03, -3.900532466948409e-03, -3.758006719596473e-03, -3.462226871101535e-03, -3.037038298629825e-03, -2.510269249380764e-03, -1.912238389850182e-03, -1.274251404913447e-03, -6.271537303228204e-04, -1.422482656398999e-18, +5.811080624426164e-04, +1.093974255016849e-03, +1.521021876908738e-03, +1.849752491313908e-03, +2.072945458973295e-03, +2.188606246517629e-03, +2.199682452179964e-03, +2.113575906669355e-03, +1.941486748731660e-03, +1.697630799350524e-03, +1.398374734488549e-03, +1.061334465662964e-03, +7.044808705458705e-04, +3.452937604228947e-04, +9.746950818779534e-19, -3.170746535382728e-04, -5.940177657925908e-04, -8.216921898513225e-04, -9.939415631563015e-04, -1.107640974148221e-03, -1.162601694464620e-03, -1.161345220483996e-03, -1.108767055632304e-03, -1.011714513697282e-03, -8.785052315963854e-04, -7.184140229675020e-04, -5.411552308801147e-04, -3.563859653300760e-04, -1.732527127898052e-04, -5.818801416923580e-19, +1.563446669975615e-04, +2.902002172907180e-04, +3.975713799264791e-04, +4.760984242947349e-04, +5.250221548270982e-04, +5.450729176175875e-04, +5.382955231045915e-04, +5.078242936704864e-04, +4.576238491064392e-04, +3.922117380894736e-04, +3.163786496265269e-04, +2.349207769898906e-04, +1.523970757644272e-04, +7.292180213001337e-05, +2.810064795067786e-19, -6.358930335348977e-05, -1.158603651792638e-04, -1.556394266046803e-04, -1.825383318834690e-04, -1.968886856400547e-04, -1.996438192500382e-04, -1.922569599584802e-04, -1.765445671257668e-04, -1.545438297704662e-04, -1.283728480660395e-04, -1.001011132655914e-04, -7.163663994481459e-05, -4.463458936757081e-05, -2.043055832879108e-05];
    var TAB_LTPF_INTERP_R = [-2.874561161519444e-03, -3.001251025861499e-03, +2.745471654059321e-03, +1.535727698935322e-02, +2.868234046665657e-02, +2.950385026557377e-02, +4.598334491135473e-03, -4.729632459043440e-02, -1.058359163062837e-01, -1.303050213607112e-01, -7.544046357555201e-02, +8.357885725250529e-02, +3.301825710764459e-01, +6.032970076366158e-01, +8.174886856243178e-01, +8.986382851273982e-01, +8.174886856243178e-01, +6.032970076366158e-01, +3.301825710764459e-01, +8.357885725250529e-02, -7.544046357555201e-02, -1.303050213607112e-01, -1.058359163062837e-01, -4.729632459043440e-02, +4.598334491135473e-03, +2.950385026557377e-02, +2.868234046665657e-02, +1.535727698935322e-02, +2.745471654059321e-03, -3.001251025861499e-03, -2.874561161519444e-03];
    var TAB_LTPF_INTERP_X12K8 = [+6.698858366939680e-03, +3.967114782344967e-02, +1.069991860896389e-01, +2.098804630681809e-01, +3.356906254147840e-01, +4.592209296082350e-01, +5.500750019177116e-01, +5.835275754221211e-01, +5.500750019177116e-01, +4.592209296082350e-01, +3.356906254147840e-01, +2.098804630681809e-01, +1.069991860896389e-01, +3.967114782344967e-02, +6.698858366939680e-03];
    var TAB_LTPF_NUM_8000 = [[6.023618207009578e-01, 4.197609261363617e-01, -1.883424527883687e-02], [5.994768582584314e-01, 4.197609261363620e-01, -1.594928283631041e-02], [5.967764663733787e-01, 4.197609261363617e-01, -1.324889095125780e-02], [5.942410120098895e-01, 4.197609261363618e-01, -1.071343658776831e-02]];
    var TAB_LTPF_NUM_16000 = [[6.023618207009578e-01, 4.197609261363617e-01, -1.883424527883687e-02], [5.994768582584314e-01, 4.197609261363620e-01, -1.594928283631041e-02], [5.967764663733787e-01, 4.197609261363617e-01, -1.324889095125780e-02], [5.942410120098895e-01, 4.197609261363618e-01, -1.071343658776831e-02]];
    var TAB_LTPF_NUM_24000 = [[3.989695588963494e-01, 5.142508607708275e-01, 1.004382966157454e-01, -1.278893956818042e-02, -1.572280075461383e-03], [3.948634911286333e-01, 5.123819208048688e-01, 1.043194926386267e-01, -1.091999960222166e-02, -1.347408330627317e-03], [3.909844475885914e-01, 5.106053522688359e-01, 1.079832524685944e-01, -9.143431066188848e-03, -1.132124620551895e-03], [3.873093888199928e-01, 5.089122083363975e-01, 1.114517380217371e-01, -7.450287133750717e-03, -9.255514050963111e-04]];
    var TAB_LTPF_NUM_32000 = [[2.982379446702096e-01, 4.652809203721290e-01, 2.105997428614279e-01, 3.766780380806063e-02, -1.015696155796564e-02, -2.535880996101096e-03, -3.182946168719958e-04], [2.943834154510240e-01, 4.619294002718798e-01, 2.129465770091844e-01, 4.066175002688857e-02, -8.693272297010050e-03, -2.178307114679820e-03, -2.742888063983188e-04], [2.907439213122688e-01, 4.587461910960279e-01, 2.151456974108970e-01, 4.350104772529774e-02, -7.295495347716925e-03, -1.834395637237086e-03, -2.316920186482416e-04], [2.872975852589158e-01, 4.557148886861379e-01, 2.172126950911401e-01, 4.620088878229615e-02, -5.957463802125952e-03, -1.502934284345198e-03, -1.903851911308866e-04]];
    var TAB_LTPF_NUM_48000 = [[1.981363739883217e-01, 3.524494903964904e-01, 2.513695269649414e-01, 1.424146237314458e-01, 5.704731023952599e-02, 9.293366241586384e-03, -7.226025368953745e-03, -3.172679890356356e-03, -1.121835963567014e-03, -2.902957238400140e-04, -4.270815593769240e-05], [1.950709426598375e-01, 3.484660408341632e-01, 2.509988459466574e-01, 1.441167412482088e-01, 5.928947317677285e-02, 1.108923827452231e-02, -6.192908108653504e-03, -2.726705509251737e-03, -9.667125826217151e-04, -2.508100923165204e-04, -3.699938766131869e-05], [1.921810055196015e-01, 3.446945561091513e-01, 2.506220094626024e-01, 1.457102447664837e-01, 6.141132133664525e-02, 1.279941396562798e-02, -5.203721087886321e-03, -2.297324511109085e-03, -8.165608133217555e-04, -2.123855748277408e-04, -3.141271330981649e-05], [1.894485314175868e-01, 3.411139251108252e-01, 2.502406876894361e-01, 1.472065631098081e-01, 6.342477229539051e-02, 1.443203434150312e-02, -4.254449144657098e-03, -1.883081472613493e-03, -6.709619060722140e-04, -1.749363341966872e-04, -2.593864735284285e-05]];
    var TAB_LTPF_DEN_8000 = [[0.000000000000000e+00, 2.098804630681809e-01, 5.835275754221211e-01, 2.098804630681809e-01, 0.000000000000000e+00], [0.000000000000000e+00, 1.069991860896389e-01, 5.500750019177116e-01, 3.356906254147840e-01, 6.698858366939680e-03], [0.000000000000000e+00, 3.967114782344967e-02, 4.592209296082350e-01, 4.592209296082350e-01, 3.967114782344967e-02], [0.000000000000000e+00, 6.698858366939680e-03, 3.356906254147840e-01, 5.500750019177116e-01, 1.069991860896389e-01]];
    var TAB_LTPF_DEN_16000 = [[0.000000000000000e+00, 2.098804630681809e-01, 5.835275754221211e-01, 2.098804630681809e-01, 0.000000000000000e+00], [0.000000000000000e+00, 1.069991860896389e-01, 5.500750019177116e-01, 3.356906254147840e-01, 6.698858366939680e-03], [0.000000000000000e+00, 3.967114782344967e-02, 4.592209296082350e-01, 4.592209296082350e-01, 3.967114782344967e-02], [0.000000000000000e+00, 6.698858366939680e-03, 3.356906254147840e-01, 5.500750019177116e-01, 1.069991860896389e-01]];
    var TAB_LTPF_DEN_24000 = [[0.000000000000000e+00, 6.322231627323796e-02, 2.507309606013235e-01, 3.713909428901578e-01, 2.507309606013235e-01, 6.322231627323796e-02, 0.000000000000000e+00], [0.000000000000000e+00, 3.459272174099855e-02, 1.986515602645028e-01, 3.626411726581452e-01, 2.986750548992179e-01, 1.013092873505928e-01, 4.263543712369752e-03], [0.000000000000000e+00, 1.535746784963907e-02, 1.474344878058222e-01, 3.374259553990717e-01, 3.374259553990717e-01, 1.474344878058222e-01, 1.535746784963907e-02], [0.000000000000000e+00, 4.263543712369752e-03, 1.013092873505928e-01, 2.986750548992179e-01, 3.626411726581452e-01, 1.986515602645028e-01, 3.459272174099855e-02]];
    var TAB_LTPF_DEN_32000 = [[0.000000000000000e+00, 2.900401878228730e-02, 1.129857420560927e-01, 2.212024028097570e-01, 2.723909472446145e-01, 2.212024028097570e-01, 1.129857420560927e-01, 2.900401878228730e-02, 0.000000000000000e+00], [0.000000000000000e+00, 1.703153418385261e-02, 8.722503785537784e-02, 1.961407762232199e-01, 2.689237982237257e-01, 2.424999102756389e-01, 1.405773364650031e-01, 4.474877169485788e-02, 3.127030243100724e-03], [0.000000000000000e+00, 8.563673748488349e-03, 6.426222944493845e-02, 1.687676705918012e-01, 2.587445937795505e-01, 2.587445937795505e-01, 1.687676705918012e-01, 6.426222944493845e-02, 8.563673748488349e-03], [0.000000000000000e+00, 3.127030243100724e-03, 4.474877169485788e-02, 1.405773364650031e-01, 2.424999102756389e-01, 2.689237982237257e-01, 1.961407762232199e-01, 8.722503785537784e-02, 1.703153418385261e-02]];
    var TAB_LTPF_DEN_48000 = [[0.000000000000000e+00, 1.082359386659387e-02, 3.608969221303979e-02, 7.676401468099964e-02, 1.241530577501703e-01, 1.627596438300696e-01, 1.776771417779109e-01, 1.627596438300696e-01, 1.241530577501703e-01, 7.676401468099964e-02, 3.608969221303979e-02, 1.082359386659387e-02, 0.000000000000000e+00], [0.000000000000000e+00, 7.041404930459358e-03, 2.819702319820420e-02, 6.547044935127551e-02, 1.124647986743299e-01, 1.548418956489015e-01, 1.767122381341857e-01, 1.691507213057663e-01, 1.352901577989766e-01, 8.851425011427483e-02, 4.499353848562444e-02, 1.557613714732002e-02, 2.039721956502016e-03], [0.000000000000000e+00, 4.146998467444788e-03, 2.135757310741917e-02, 5.482735584552816e-02, 1.004971444643720e-01, 1.456060342830002e-01, 1.738439838565869e-01, 1.738439838565869e-01, 1.456060342830002e-01, 1.004971444643720e-01, 5.482735584552816e-02, 2.135757310741917e-02, 4.146998467444788e-03], [0.000000000000000e+00, 2.039721956502016e-03, 1.557613714732002e-02, 4.499353848562444e-02, 8.851425011427483e-02, 1.352901577989766e-01, 1.691507213057663e-01, 1.767122381341857e-01, 1.548418956489015e-01, 1.124647986743299e-01, 6.547044935127551e-02, 2.819702319820420e-02, 7.041404930459358e-03]];
    module.exports = {
      "TAB_RESAMP_FILTER": TAB_RESAMP_FILTER,
      "TAB_LTPF_INTERP_R": TAB_LTPF_INTERP_R,
      "TAB_LTPF_INTERP_X12K8": TAB_LTPF_INTERP_X12K8,
      "TAB_LTPF_NUM_8000": TAB_LTPF_NUM_8000,
      "TAB_LTPF_NUM_16000": TAB_LTPF_NUM_16000,
      "TAB_LTPF_NUM_24000": TAB_LTPF_NUM_24000,
      "TAB_LTPF_NUM_32000": TAB_LTPF_NUM_32000,
      "TAB_LTPF_NUM_48000": TAB_LTPF_NUM_48000,
      "TAB_LTPF_DEN_8000": TAB_LTPF_DEN_8000,
      "TAB_LTPF_DEN_16000": TAB_LTPF_DEN_16000,
      "TAB_LTPF_DEN_24000": TAB_LTPF_DEN_24000,
      "TAB_LTPF_DEN_32000": TAB_LTPF_DEN_32000,
      "TAB_LTPF_DEN_48000": TAB_LTPF_DEN_48000
    };
  },
  "lc3/tables/nb": function lc3TablesNb(module, require) {
    var NB_TBL = [[64, 64, 64, 64, 64, 64], [60, 64, 64, 64, 64, 64]];
    module.exports = {
      "NB_TBL": NB_TBL
    };
  },
  "lc3/tables/ne": function lc3TablesNe(module, require) {
    var NE_TBL = [[80, 160, 240, 320, 400, 400], [60, 120, 180, 240, 300, 300]];
    module.exports = {
      "NE_TBL": NE_TBL
    };
  },
  "lc3/tables/nf": function lc3TablesNf(module, require) {
    var NF_TBL = [[80, 160, 240, 320, 480, 480], [60, 120, 180, 240, 360, 360]];
    module.exports = {
      "NF_TBL": NF_TBL
    };
  },
  "lc3/tables/nle": function lc3TablesNle(module, require) {
    var NFSTART_TBL = [24, 18];
    var NFWIDTH_TBL = [3, 2];
    var BW_STOP_TBL = [[80, 160, 240, 320, 400], [60, 120, 180, 240, 300]];
    module.exports = {
      "NFSTART_TBL": NFSTART_TBL,
      "NFWIDTH_TBL": NFWIDTH_TBL,
      "BW_STOP_TBL": BW_STOP_TBL
    };
  },
  "lc3/tables/nnidx": function lc3TablesNnidx(module, require) {
    var NNIDX_TBL = [[62, 62, 62, 62, 62, 62], [56, 60, 60, 60, 60, 60]];
    module.exports = {
      "NNIDX_TBL": NNIDX_TBL
    };
  },
  "lc3/tables/sns": function lc3TablesSns(module, require) {
    var LFCB = [[+2.262833655926780e+00, +8.133112690613385e-01, -5.301934948714359e-01, -1.356648359034418e+00, -1.599521765631959e+00, -1.440987684300950e+00, -1.143816483058210e+00, -7.552037679090641e-01], [+2.945164791913764e+00, +2.411433179566788e+00, +9.604551064007274e-01, -4.432264880769172e-01, -1.229136124255896e+00, -1.555900391181699e+00, -1.496886559523759e+00, -1.116899865014692e+00], [-2.186107070099790e+00, -1.971521356752276e+00, -1.787186196810059e+00, -1.918658956855768e+00, -1.793991218365963e+00, -1.357384042572884e+00, -7.054442793538694e-01, -4.781729447777114e-02], [+6.936882365289195e-01, +9.556098571582197e-01, +5.752307870387333e-01, -1.146034194628886e-01, -6.460506374360290e-01, -9.523513704496247e-01, -1.074052472261504e+00, -7.580877070949045e-01], [-1.297521323152956e+00, -7.403690571778526e-01, -3.453724836421064e-01, -3.132856962479401e-01, -4.029772428244766e-01, -3.720208534652272e-01, -7.834141773237381e-02, +9.704413039922949e-02], [+9.146520378306716e-01, +1.742930434352573e+00, +1.909066268599861e+00, +1.544084838426651e+00, +1.093449607614550e+00, +6.474795495182776e-01, +3.617907524496421e-02, -2.970928071788889e-01], [-2.514288125789621e+00, -2.891752713843728e+00, -2.004506667594338e+00, -7.509122739031269e-01, +4.412021049046914e-01, +1.201909876010087e+00, +1.327428572572904e+00, +1.220490811409839e+00], [-9.221884048123851e-01, +6.324951414405520e-01, +1.087364312546411e+00, +6.086286245358197e-01, +1.311745675473482e-01, -2.961491577437521e-01, -2.070135165256287e-01, +1.349249166420795e-01], [+7.903222883692664e-01, +6.284012618761988e-01, +3.931179235404499e-01, +4.800077108669007e-01, +4.478151380501427e-01, +2.097342145522343e-01, +6.566919964280205e-03, -8.612423420618573e-02], [+1.447755801787238e+00, +2.723999516749523e+00, +2.310832687375278e+00, +9.350512695665294e-01, -2.747439113836877e-01, -9.020776968286019e-01, -9.406815119454044e-01, -6.336970389743102e-01], [+7.933545264174744e-01, +1.439311855234535e-02, -5.678348447296789e-01, -6.547604679167449e-01, -4.794589984757430e-01, -1.738946619028885e-01, +6.801627055154381e-02, +2.951259483697938e-01], [+2.724253473850336e+00, +2.959475724048243e+00, +1.849535592684608e+00, +5.632849223223643e-01, +1.399170881250724e-01, +3.596410933662221e-01, +6.894613547745887e-01, +6.397901768331046e-01], [-5.308301983754000e-01, -2.126906828121638e-01, +5.766136283770966e-03, +4.248714843837454e-01, +4.731289521586675e-01, +8.588941993212806e-01, +1.191111608544352e+00, +9.961896696383581e-01], [+1.687284108450062e+00, +2.436145092376558e+00, +2.330194290782250e+00, +1.779837778350905e+00, +1.444112953900818e+00, +1.519951770097301e+00, +1.471993937504249e+00, +9.776824738917613e-01], [-2.951832728018580e+00, -1.593934967733454e+00, -1.099187728780224e-01, +3.886090729192574e-01, +5.129326495175837e-01, +6.281125970634966e-01, +8.226217964306339e-01, +8.758914246550805e-01], [+1.018783427856281e-01, +5.898573242289165e-01, +6.190476467934656e-01, +1.267313138517963e+00, +2.419610477698038e+00, +2.251742525721865e+00, +5.265370309912005e-01, -3.965915132279989e-01], [+2.682545754984259e+00, +1.327380108994199e+00, +1.301852738040482e-01, -3.385330885113471e-01, -3.682192358996665e-01, -1.916899467159607e-01, -1.547823771539079e-01, -2.342071777743923e-01], [+4.826979236804030e+00, +3.119478044924880e+00, +1.395136713851784e+00, +2.502953159187215e-01, -3.936138393797931e-01, -6.434581730547007e-01, -6.425707368569433e-01, -7.231932234440720e-01], [+8.784199364703349e-02, -5.695868402385010e-01, -1.145060156688110e+00, -1.669684881725975e+00, -1.845344176036817e+00, -1.564680273288019e+00, -1.117467590764198e+00, -5.339816633667862e-01], [+1.391023082043259e+00, +1.981464791994655e+00, +1.112657963887701e+00, -2.201075094207434e-01, -7.749656115523655e-01, -5.940638741491173e-01, +1.369376806289231e-01, +8.182428912643381e-01], [+3.845858938891820e-01, -1.605887855365100e-01, -5.393668095577095e-01, -5.293090787898571e-01, +1.904335474379324e-01, +2.560629181065215e+00, +2.818963982452484e+00, +6.566708756961611e-01], [+1.932273994417191e+00, +3.010301804120569e+00, +3.065438938262036e+00, +2.501101608700079e+00, +1.930895929789344e+00, +5.721538109618367e-01, -8.117417940810907e-01, -1.176418108619025e+00], [+1.750804628998837e-01, -7.505228322489846e-01, -1.039438933422309e+00, -1.135775089376484e+00, -1.041979038374938e+00, -1.520600989933816e-02, +2.070483917167066e+00, +3.429489180816891e+00], [-1.188170202505555e+00, +3.667928736626364e-01, +1.309578304090959e+00, +1.683306872804914e+00, +1.251009242251268e+00, +9.423757516286146e-01, +8.262504833741330e-01, +4.399527411209563e-01], [+2.533222033270612e+00, +2.112746426959081e+00, +1.262884115020644e+00, +7.615135124304274e-01, +5.221179379761699e-01, +1.186800697571213e-01, -4.523468275073703e-01, -7.003524261611032e-01], [+3.998898374856063e+00, +4.079017514519560e+00, +2.822856611024964e+00, +1.726072128495800e+00, +6.471443773486192e-01, -3.311485212172380e-01, -8.840425708487493e-01, -1.126973406454781e+00], [+5.079025931863813e-01, +1.588384497895265e+00, +1.728990238692094e+00, +1.006922302417256e+00, +3.771212318163816e-01, +4.763707668994976e-01, +1.087547403721699e+00, +1.087562660992209e+00], [+3.168568251075689e+00, +3.258534581594065e+00, +2.422305913285988e+00, +1.794460776432612e+00, +1.521779106530886e+00, +1.171967065376021e+00, +4.893945969806952e-01, -6.227957157187685e-02], [+1.894147667317636e+00, +1.251086946092320e+00, +5.904512107206275e-01, +6.083585832937136e-01, +8.781710100110816e-01, +1.119125109509496e+00, +1.018576615503421e+00, +6.204538910117241e-01], [+9.488806045171881e-01, +2.132394392499823e+00, +2.723453503442780e+00, +2.769860768665877e+00, +2.542869732549456e+00, +2.020462638250194e+00, +8.300458594009102e-01, -2.755691738882634e-02], [-1.880267570456275e+00, -1.264310727587049e+00, +3.114249769686986e-01, +1.836702103064300e+00, +2.256341918398738e+00, +2.048189984634735e+00, +2.195268374585677e+00, +2.026596138366193e+00], [+2.463757462771289e-01, +9.556217733930993e-01, +1.520467767417663e+00, +1.976474004194571e+00, +1.940438671774617e+00, +2.233758472826862e+00, +1.988359777584072e+00, +1.272326725547010e+00]];
    var HFCB = [[+2.320284191244650e-01, -1.008902706044547e+00, -2.142235027894714e+00, -2.375338135706641e+00, -2.230419330496551e+00, -2.175958812236960e+00, -2.290659135409999e+00, -2.532863979798455e+00], [-1.295039366736175e+00, -1.799299653843385e+00, -1.887031475315188e+00, -1.809916596873323e+00, -1.763400384792061e+00, -1.834184284679500e+00, -1.804809806874051e+00, -1.736795453174010e+00], [+1.392857160458027e-01, -2.581851261717519e-01, -6.508045726701103e-01, -1.068157317819692e+00, -1.619287415243023e+00, -2.187625664417564e+00, -2.637575869390537e+00, -2.978977495750963e+00], [-3.165131021857248e-01, -4.777476572098050e-01, -5.511620758797545e-01, -4.847882833811970e-01, -2.383883944558142e-01, -1.430245072855038e-01, +6.831866736490735e-02, +8.830617172880660e-02], [+8.795184052264962e-01, +2.983400960071886e-01, -9.153863964057101e-01, -2.206459747397620e+00, -2.741421809599509e+00, -2.861390742768913e+00, -2.888415971052714e+00, -2.951826082625207e+00], [-2.967019224553751e-01, -9.750049191745525e-01, -1.358575002469926e+00, -9.837211058374442e-01, -6.529569391008090e-01, -9.899869929218105e-01, -1.614672245988999e+00, -2.407123023851163e+00], [+3.409811004696971e-01, +2.688997889460545e-01, +5.633356848280326e-02, +4.991140468266853e-02, -9.541307274143691e-02, -7.601661460838854e-01, -2.327581201770068e+00, -3.771554853856562e+00], [-1.412297590775968e+00, -1.485221193498518e+00, -1.186035798347001e+00, -6.250016344413516e-01, +1.539024974683036e-01, +5.763864978107553e-01, +7.950926037988714e-01, +5.965646321449126e-01], [-2.288395118273794e-01, -3.337190697846616e-01, -8.093213593246560e-01, -1.635878769237973e+00, -1.884863973309819e+00, -1.644966913163562e+00, -1.405157780466116e+00, -1.466664713261457e+00], [-1.071486285444486e+00, -1.417670154562606e+00, -1.548917622654407e+00, -1.452960624755303e+00, -1.031829700622701e+00, -6.906426402725842e-01, -4.288438045321706e-01, -4.949602154088736e-01], [-5.909885111880511e-01, -7.117377585376282e-02, +3.457195229473127e-01, +3.005494609962507e-01, -1.118652182958568e+00, -2.440891511480490e+00, -2.228547324507349e+00, -1.895092282108533e+00], [-8.484340988361639e-01, -5.832268107088888e-01, +9.004236881428734e-02, +8.450250075568864e-01, +1.065723845017161e+00, +7.375829993777555e-01, +2.565904524599121e-01, -4.919633597623784e-01], [+1.140691455623824e+00, +9.640168923982929e-01, +3.814612059847975e-01, -4.828493406089983e-01, -1.816327212605887e+00, -2.802795127285548e+00, -3.233857248338638e+00, -3.459087144914729e+00], [-3.762832379674643e-01, +4.256754620961052e-02, +5.165476965923055e-01, +2.517168818646298e-01, -2.161799675243032e-01, -5.340740911245042e-01, -6.407860962621957e-01, -8.697450323741350e-01], [+6.650041205984020e-01, +1.097907646907945e+00, +1.383426671120792e+00, +1.343273586282854e+00, +8.229788368559223e-01, +2.158767985156789e-01, -4.049257530802925e-01, -1.070256058705229e+00], [-8.262659539826793e-01, -6.711812327666034e-01, -2.284955927794715e-01, +5.189808525519373e-01, +1.367218963402784e+00, +2.180230382530922e+00, +2.535960927501071e+00, +2.201210988600361e+00], [+1.410083268321729e+00, +7.544419078354684e-01, -1.305505849586310e+00, -1.871337113509707e+00, -1.240086851563054e+00, -1.267129248662737e+00, -2.036708130039070e+00, -2.896851622423807e+00], [+3.613868175743476e-01, -2.199917054278258e-02, -5.793688336338242e-01, -8.794279609410701e-01, -8.506850234081188e-01, -7.793970501558157e-01, -7.321829272918255e-01, -8.883485148212548e-01], [+4.374692393303287e-01, +3.054404196059607e-01, -7.387865664783739e-03, -4.956498547102520e-01, -8.066512711183929e-01, -1.224318919844005e+00, -1.701577700431810e+00, -2.244919137556108e+00], [+6.481003189965029e-01, +6.822991336406795e-01, +2.532474643329756e-01, +7.358421437884688e-02, +3.142167093890103e-01, +2.347298809236790e-01, +1.446001344798368e-01, -6.821201788801744e-02], [+1.119198330913041e+00, +1.234655325360046e+00, +5.891702380853181e-01, -1.371924596531664e+00, -2.370957072415767e+00, -2.007797826823599e+00, -1.666885402243946e+00, -1.926318462584058e+00], [+1.418474970871759e-01, -1.106600706331509e-01, -2.828245925436287e-01, -6.598134746141936e-03, +2.859292796272158e-01, +4.604455299529710e-02, -6.025964155778858e-01, -2.265687286325748e+00], [+5.040469553902519e-01, +8.269821629590972e-01, +1.119812362918282e+00, +1.179140443327336e+00, +1.079874291972597e+00, +6.975362390675000e-01, -9.125488173710808e-01, -3.576847470627726e+00], [-5.010760504793567e-01, -3.256780060814170e-01, +2.807981949470768e-02, +2.620545547631326e-01, +3.605908060857668e-01, +6.356237220536995e-01, +9.590124671781544e-01, +1.307451566886533e+00], [+3.749709827096420e+00, +1.523426118470452e+00, -4.577156618978547e-01, -7.987110082431923e-01, -3.868193293091003e-01, -3.759010622312032e-01, -6.578368999305377e-01, -1.281639642436027e+00], [-1.152589909805491e+00, -1.108008859062412e+00, -5.626151165124718e-01, -2.205621237656746e-01, -3.498428803366437e-01, -7.534327702504950e-01, -9.885965933963837e-01, -1.287904717914711e+00], [+1.028272464221398e+00, +1.097705193898282e+00, +7.686455457647760e-01, +2.060819777407656e-01, -3.428057350919982e-01, -7.549394046253397e-01, -1.041961776319998e+00, -1.503356529555287e+00], [+1.288319717078174e-01, +6.894393952648783e-01, +1.123469050095749e+00, +1.309345231065936e+00, +1.355119647139345e+00, +1.423113814707990e+00, +1.157064491909045e+00, +4.063194375168383e-01], [+1.340330303347565e+00, +1.389968250677893e+00, +1.044679217088833e+00, +6.358227462443666e-01, -2.747337555184823e-01, -1.549233724306950e+00, -2.442397102780069e+00, -3.024576069445502e+00], [+2.138431054193125e+00, +4.247112673031041e+00, +2.897341098304393e+00, +9.327306580268148e-01, -2.928222497298096e-01, -8.104042968531823e-01, -7.888680987564828e-01, -9.353531487613377e-01], [+5.648304873553961e-01, +1.591849779587432e+00, +2.397716990151462e+00, +3.036973436007040e+00, +2.664243503371508e+00, +1.393044850326060e+00, +4.038340235957454e-01, -6.562709713281135e-01], [-4.224605475860865e-01, +3.261496250498011e-01, +1.391713133422612e+00, +2.231466146364735e+00, +2.611794421696881e+00, +2.665403401965702e+00, +2.401035541057067e+00, +1.759203796708810e+00]];
    var SNS_VQ_REG_ADJ_GAINS = [2.176513671875, 2.94287109375];
    var SNS_VQ_REG_LF_ADJ_GAINS = [1.524658203125, 3.672607421875, 4.360595703125, 5.13037109375];
    var SNS_VQ_NEAR_ADJ_GAINS = [1.733154296875, 2.2294921875, 2.747314453125, 3.615234375];
    var SNS_VQ_FAR_ADJ_GAINS = [1.05859375, 1.237060546875, 1.439208984375, 1.989501953125, 2.498779296875, 3.131103515625, 4.1181640625, 4.85400390625];
    var SNS_GAINMSBBITS = [1, 1, 2, 2];
    var SNS_GAINLSBBITS = [0, 1, 0, 1];
    var GIJ = [SNS_VQ_REG_ADJ_GAINS, SNS_VQ_REG_LF_ADJ_GAINS, SNS_VQ_NEAR_ADJ_GAINS, SNS_VQ_FAR_ADJ_GAINS];
    var DCTII_16x16 = [[0.25, 0.35185093438159565, 0.3467599613305369, 0.33832950029358816, 0.32664074121909414, 0.31180625324666783, 0.2939689006048397, 0.2733004667504394, 0.25000000000000006, 0.2242918965856591, 0.1964237395967756, 0.1666639146194367, 0.13529902503654928, 0.10263113188058934, 0.06897484482073578, 0.034654292299772925], [0.25, 0.33832950029358816, 0.2939689006048397, 0.2242918965856591, 0.13529902503654928, 0.034654292299772925, -0.06897484482073574, -0.16666391461943666, -0.25, -0.3118062532466678, -0.3467599613305369, -0.35185093438159565, -0.3266407412190942, -0.27330046675043945, -0.19642373959677553, -0.10263113188058938], [0.25, 0.31180625324666783, 0.1964237395967756, 0.034654292299772925, -0.13529902503654925, -0.2733004667504394, -0.3467599613305369, -0.3383295002935882, -0.25000000000000006, -0.10263113188058938, 0.06897484482073576, 0.22429189658565912, 0.3266407412190941, 0.35185093438159565, 0.29396890060483977, 0.16666391461943675], [0.25, 0.2733004667504394, 0.06897484482073578, -0.16666391461943666, -0.32664074121909414, -0.3383295002935882, -0.19642373959677553, 0.03465429229977269, 0.24999999999999994, 0.35185093438159565, 0.29396890060483977, 0.10263113188058942, -0.1352990250365493, -0.3118062532466678, -0.34675996133053694, -0.22429189658565904], [0.25, 0.2242918965856591, -0.06897484482073574, -0.3118062532466678, -0.3266407412190942, -0.10263113188058938, 0.19642373959677542, 0.35185093438159565, 0.25000000000000006, -0.03465429229977264, -0.29396890060483966, -0.33832950029358816, -0.13529902503654953, 0.16666391461943653, 0.3467599613305369, 0.2733004667504396], [0.25, 0.1666639146194367, -0.19642373959677548, -0.35185093438159565, -0.13529902503654945, 0.22429189658565912, 0.3467599613305369, 0.10263113188058942, -0.24999999999999972, -0.33832950029358816, -0.06897484482073567, 0.2733004667504394, 0.32664074121909414, 0.03465429229977294, -0.2939689006048396, -0.3118062532466682], [0.25, 0.10263113188058934, -0.2939689006048397, -0.27330046675043945, 0.13529902503654934, 0.35185093438159565, 0.06897484482073593, -0.3118062532466678, -0.2499999999999999, 0.16666391461943653, 0.34675996133053694, 0.03465429229977294, -0.32664074121909403, -0.22429189658565912, 0.1964237395967753, 0.3383295002935884], [0.25, 0.034654292299772925, -0.3467599613305369, -0.10263113188058938, 0.3266407412190941, 0.16666391461943675, -0.29396890060483966, -0.22429189658565904, 0.2499999999999997, 0.2733004667504396, -0.1964237395967753, -0.3118062532466682, 0.13529902503654917, 0.3383295002935884, -0.06897484482073586, -0.3518509343815957], [0.25, -0.03465429229977288, -0.3467599613305369, 0.10263113188058924, 0.32664074121909414, -0.16666391461943658, -0.2939689006048398, 0.22429189658565882, 0.24999999999999992, -0.2733004667504394, -0.1964237395967757, 0.311806253246668, 0.13529902503654964, -0.3383295002935882, -0.06897484482073646, 0.3518509343815956], [0.25, -0.10263113188058928, -0.29396890060483977, 0.2733004667504393, 0.1352990250365495, -0.35185093438159565, 0.06897484482073538, 0.31180625324666794, -0.24999999999999964, -0.16666391461943686, 0.3467599613305369, -0.03465429229977309, -0.3266407412190945, 0.22429189658565868, 0.19642373959677578, -0.33832950029358816], [0.25, -0.16666391461943666, -0.19642373959677553, 0.35185093438159565, -0.1352990250365493, -0.22429189658565904, 0.3467599613305369, -0.10263113188058942, -0.24999999999999994, 0.3383295002935882, -0.06897484482073586, -0.27330046675043934, 0.3266407412190942, -0.03465429229977301, -0.2939689006048396, 0.31180625324666794], [0.25, -0.22429189658565904, -0.0689748448207359, 0.31180625324666783, -0.32664074121909403, 0.10263113188058946, 0.19642373959677567, -0.35185093438159565, 0.2499999999999996, 0.034654292299773654, -0.2939689006048396, 0.33832950029358816, -0.13529902503654906, -0.16666391461943703, 0.34675996133053705, -0.2733004667504396], [0.25, -0.2733004667504394, 0.06897484482073576, 0.16666391461943675, -0.32664074121909414, 0.33832950029358805, -0.1964237395967753, -0.03465429229977361, 0.25, -0.3518509343815957, 0.2939689006048392, -0.10263113188058925, -0.13529902503654978, 0.31180625324666833, -0.3467599613305366, 0.22429189658565854], [0.25, -0.3118062532466678, 0.19642373959677542, -0.03465429229977264, -0.13529902503654953, 0.2733004667504396, -0.34675996133053694, 0.3383295002935882, -0.2499999999999996, 0.1026311318805893, 0.0689748448207365, -0.22429189658565923, 0.3266407412190945, -0.3518509343815956, 0.2939689006048398, -0.16666391461943508], [0.25, -0.33832950029358816, 0.2939689006048397, -0.22429189658565885, 0.13529902503654925, -0.03465429229977256, -0.06897484482073638, 0.16666391461943691, -0.25000000000000006, 0.3118062532466683, -0.346759961330537, 0.3518509343815956, -0.3266407412190937, 0.2733004667504388, -0.19642373959677503, 0.10263113188058905], [0.25, -0.3518509343815956, 0.3467599613305368, -0.33832950029358805, 0.32664074121909403, -0.3118062532466677, 0.29396890060483927, -0.27330046675043895, 0.24999999999999956, -0.22429189658565865, 0.19642373959677514, -0.16666391461943517, 0.13529902503654775, -0.10263113188058788, 0.06897484482073434, -0.0346542922997715]];
    module.exports = {
      "LFCB": LFCB,
      "HFCB": HFCB,
      "SNS_VQ_REG_ADJ_GAINS": SNS_VQ_REG_ADJ_GAINS,
      "SNS_VQ_REG_LF_ADJ_GAINS": SNS_VQ_REG_LF_ADJ_GAINS,
      "SNS_VQ_NEAR_ADJ_GAINS": SNS_VQ_NEAR_ADJ_GAINS,
      "SNS_VQ_FAR_ADJ_GAINS": SNS_VQ_FAR_ADJ_GAINS,
      "SNS_GAINMSBBITS": SNS_GAINMSBBITS,
      "SNS_GAINLSBBITS": SNS_GAINLSBBITS,
      "GIJ": GIJ,
      "DCTII_16x16": DCTII_16x16
    };
  },
  "lc3/tables/sq": function lc3TablesSq(module, require) {
    var NBITSLASTNZ_TBL = [[6, 7, 7, 8, 8, 8], [5, 6, 7, 7, 8, 8]];
    var GGOFF_TBL = [[-126, -126, -127, -128, -129, -130, -130, -131, -132, -133, -134, -134, -135, -136, -137, -138, -138, -139, -140, -141, -142, -142, -143, -144, -145, -146, -146, -147, -148, -149, -150, -150, -151, -152, -153, -154, -154, -155, -156, -157, -158, -158, -159, -160, -161, -162, -162, -163, -164, -165, -166, -166, -167, -168, -169, -170, -170, -171, -172, -173, -174, -174, -175, -176, -177, -178, -178, -179, -180, -181, -182, -182, -183, -184, -185, -186, -186, -187, -188, -189, -190, -190, -191, -192, -193, -194, -194, -195, -196, -197, -198, -198, -199, -200, -201, -202, -202, -203, -204, -205, -206, -206, -207, -208, -209, -210, -210, -211, -212, -213, -214, -214, -215, -216, -217, -218, -218, -219, -220, -221, -222, -222, -223, -224, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225, -225], [-123, -123, -123, -124, -124, -125, -125, -125, -126, -126, -127, -127, -127, -128, -128, -129, -129, -129, -130, -130, -131, -131, -131, -132, -132, -133, -133, -133, -134, -134, -135, -135, -135, -136, -136, -137, -137, -137, -138, -138, -139, -139, -139, -140, -140, -141, -141, -141, -142, -142, -143, -143, -143, -144, -144, -145, -145, -145, -146, -146, -147, -147, -147, -148, -148, -149, -149, -149, -150, -150, -151, -151, -151, -152, -152, -153, -153, -153, -154, -154, -155, -155, -155, -156, -156, -157, -157, -157, -158, -158, -159, -159, -159, -160, -160, -161, -161, -161, -162, -162, -163, -163, -163, -164, -164, -165, -165, -165, -166, -166, -167, -167, -167, -168, -168, -169, -169, -169, -170, -170, -171, -171, -171, -172, -172, -173, -173, -173, -174, -174, -175, -175, -175, -176, -176, -177, -177, -177, -178, -178, -179, -179, -179, -180, -180, -181, -181, -181, -182, -182, -183, -183, -183, -184, -184, -185, -185, -185, -186, -186, -187, -187, -187, -188, -188, -189, -189, -189, -190, -190, -191, -191, -191, -192, -192, -193, -193, -193, -194, -194, -195, -195, -195, -196, -196, -197, -197, -197, -198, -198, -199, -199, -199, -200, -200, -201, -201, -201, -202, -202, -203, -203, -203, -204, -204, -205, -205, -205, -206, -206, -207, -207, -207, -208, -208, -209, -209, -209, -210, -210, -211, -211, -211, -212, -212, -213, -213, -213, -214, -214, -215, -215, -215, -216, -216, -217, -217, -217, -218, -218, -219, -219, -219, -220, -220, -221, -221, -221, -222, -222, -223, -223, -223, -224, -224, -225, -225, -225, -226, -226, -227, -227, -227, -228, -228, -229, -229, -229, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230, -230], [-125, -125, -125, -126, -126, -126, -126, -127, -127, -127, -128, -128, -128, -128, -129, -129, -129, -129, -130, -130, -130, -130, -131, -131, -131, -132, -132, -132, -132, -133, -133, -133, -133, -134, -134, -134, -134, -135, -135, -135, -136, -136, -136, -136, -137, -137, -137, -137, -138, -138, -138, -138, -139, -139, -139, -140, -140, -140, -140, -141, -141, -141, -141, -142, -142, -142, -142, -143, -143, -143, -144, -144, -144, -144, -145, -145, -145, -145, -146, -146, -146, -146, -147, -147, -147, -148, -148, -148, -148, -149, -149, -149, -149, -150, -150, -150, -150, -151, -151, -151, -152, -152, -152, -152, -153, -153, -153, -153, -154, -154, -154, -154, -155, -155, -155, -156, -156, -156, -156, -157, -157, -157, -157, -158, -158, -158, -158, -159, -159, -159, -160, -160, -160, -160, -161, -161, -161, -161, -162, -162, -162, -162, -163, -163, -163, -164, -164, -164, -164, -165, -165, -165, -165, -166, -166, -166, -166, -167, -167, -167, -168, -168, -168, -168, -169, -169, -169, -169, -170, -170, -170, -170, -171, -171, -171, -172, -172, -172, -172, -173, -173, -173, -173, -174, -174, -174, -174, -175, -175, -175, -176, -176, -176, -176, -177, -177, -177, -177, -178, -178, -178, -178, -179, -179, -179, -180, -180, -180, -180, -181, -181, -181, -181, -182, -182, -182, -182, -183, -183, -183, -184, -184, -184, -184, -185, -185, -185, -185, -186, -186, -186, -186, -187, -187, -187, -188, -188, -188, -188, -189, -189, -189, -189, -190, -190, -190, -190, -191, -191, -191, -192, -192, -192, -192, -193, -193, -193, -193, -194, -194, -194, -194, -195, -195, -195, -196, -196, -196, -196, -197, -197, -197, -197, -198, -198, -198, -198, -199, -199, -199, -200, -200, -200, -200, -201, -201, -201, -201, -202, -202, -202, -202, -203, -203, -203, -204, -204, -204, -204, -205, -205, -205, -205, -206, -206, -206, -206, -207, -207, -207, -208, -208, -208, -208, -209, -209, -209, -209, -210, -210, -210, -210, -211, -211, -211, -212, -212, -212, -212, -213, -213, -213, -213, -214, -214, -214, -214, -215, -215, -215, -216, -216, -216, -216, -217, -217, -217, -217, -218, -218, -218, -218, -219, -219, -219, -220, -220, -220, -220, -221, -221, -221, -221, -222, -222, -222, -222, -223, -223, -223, -224, -224, -224, -224, -225, -225, -225, -225, -226, -226, -226], [-129, -129, -129, -129, -129, -130, -130, -130, -130, -130, -131, -131, -131, -131, -131, -132, -132, -132, -132, -132, -133, -133, -133, -133, -133, -134, -134, -134, -134, -134, -135, -135, -135, -135, -135, -136, -136, -136, -136, -136, -137, -137, -137, -137, -137, -138, -138, -138, -138, -138, -139, -139, -139, -139, -139, -140, -140, -140, -140, -140, -141, -141, -141, -141, -141, -142, -142, -142, -142, -142, -143, -143, -143, -143, -143, -144, -144, -144, -144, -144, -145, -145, -145, -145, -145, -146, -146, -146, -146, -146, -147, -147, -147, -147, -147, -148, -148, -148, -148, -148, -149, -149, -149, -149, -149, -150, -150, -150, -150, -150, -151, -151, -151, -151, -151, -152, -152, -152, -152, -152, -153, -153, -153, -153, -153, -154, -154, -154, -154, -154, -155, -155, -155, -155, -155, -156, -156, -156, -156, -156, -157, -157, -157, -157, -157, -158, -158, -158, -158, -158, -159, -159, -159, -159, -159, -160, -160, -160, -160, -160, -161, -161, -161, -161, -161, -162, -162, -162, -162, -162, -163, -163, -163, -163, -163, -164, -164, -164, -164, -164, -165, -165, -165, -165, -165, -166, -166, -166, -166, -166, -167, -167, -167, -167, -167, -168, -168, -168, -168, -168, -169, -169, -169, -169, -169, -170, -170, -170, -170, -170, -171, -171, -171, -171, -171, -172, -172, -172, -172, -172, -173, -173, -173, -173, -173, -174, -174, -174, -174, -174, -175, -175, -175, -175, -175, -176, -176, -176, -176, -176, -177, -177, -177, -177, -177, -178, -178, -178, -178, -178, -179, -179, -179, -179, -179, -180, -180, -180, -180, -180, -181, -181, -181, -181, -181, -182, -182, -182, -182, -182, -183, -183, -183, -183, -183, -184, -184, -184, -184, -184, -185, -185, -185, -185, -185, -186, -186, -186, -186, -186, -187, -187, -187, -187, -187, -188, -188, -188, -188, -188, -189, -189, -189, -189, -189, -190, -190, -190, -190, -190, -191, -191, -191, -191, -191, -192, -192, -192, -192, -192, -193, -193, -193, -193, -193, -194, -194, -194, -194, -194, -195, -195, -195, -195, -195, -196, -196, -196, -196, -196, -197, -197, -197, -197, -197, -198, -198, -198, -198, -198, -199, -199, -199, -199, -199, -200, -200, -200, -200, -200, -201, -201, -201, -201, -201, -202, -202, -202, -202, -202, -203, -203, -203, -203, -203, -204, -204, -204, -204, -204, -205], [-133, -133, -133, -133, -133, -134, -134, -134, -134, -134, -134, -134, -135, -135, -135, -135, -135, -135, -136, -136, -136, -136, -136, -136, -137, -137, -137, -137, -137, -137, -138, -138, -138, -138, -138, -138, -138, -139, -139, -139, -139, -139, -139, -140, -140, -140, -140, -140, -140, -141, -141, -141, -141, -141, -141, -142, -142, -142, -142, -142, -142, -142, -143, -143, -143, -143, -143, -143, -144, -144, -144, -144, -144, -144, -145, -145, -145, -145, -145, -145, -146, -146, -146, -146, -146, -146, -146, -147, -147, -147, -147, -147, -147, -148, -148, -148, -148, -148, -148, -149, -149, -149, -149, -149, -149, -150, -150, -150, -150, -150, -150, -150, -151, -151, -151, -151, -151, -151, -152, -152, -152, -152, -152, -152, -153, -153, -153, -153, -153, -153, -154, -154, -154, -154, -154, -154, -154, -155, -155, -155, -155, -155, -155, -156, -156, -156, -156, -156, -156, -157, -157, -157, -157, -157, -157, -158, -158, -158, -158, -158, -158, -158, -159, -159, -159, -159, -159, -159, -160, -160, -160, -160, -160, -160, -161, -161, -161, -161, -161, -161, -162, -162, -162, -162, -162, -162, -162, -163, -163, -163, -163, -163, -163, -164, -164, -164, -164, -164, -164, -165, -165, -165, -165, -165, -165, -166, -166, -166, -166, -166, -166, -166, -167, -167, -167, -167, -167, -167, -168, -168, -168, -168, -168, -168, -169, -169, -169, -169, -169, -169, -170, -170, -170, -170, -170, -170, -170, -171, -171, -171, -171, -171, -171, -172, -172, -172, -172, -172, -172, -173, -173, -173, -173, -173, -173, -174, -174, -174, -174, -174, -174, -174, -175, -175, -175, -175, -175, -175, -176, -176, -176, -176, -176, -176, -177, -177, -177, -177, -177, -177, -178, -178, -178, -178, -178, -178, -178, -179, -179, -179, -179, -179, -179, -180, -180, -180, -180, -180, -180, -181, -181, -181, -181, -181, -181, -182, -182, -182, -182, -182, -182, -182, -183, -183, -183, -183, -183, -183, -184, -184, -184, -184, -184, -184, -185, -185, -185, -185, -185, -185, -186, -186, -186, -186, -186, -186, -186, -187, -187, -187, -187, -187, -187, -188, -188, -188, -188, -188, -188, -189, -189, -189, -189, -189, -189, -190, -190, -190, -190, -190, -190, -190, -191, -191, -191, -191, -191, -191, -192, -192, -192, -192, -192, -192, -193, -193, -193, -193, -193, -193, -194]];
    var BITRATE_C1 = [160, 320, 480, 640, 800];
    var BITRATE_C2 = [480, 640, 800, 960, 1120];
    module.exports = {
      "NBITSLASTNZ_TBL": NBITSLASTNZ_TBL,
      "GGOFF_TBL": GGOFF_TBL,
      "BITRATE_C1": BITRATE_C1,
      "BITRATE_C2": BITRATE_C2
    };
  },
  "lc3/tables/tns": function lc3TablesTns(module, require) {
    var AC_TNS_ORDER_BITS = [[17234, 13988, 11216, 8694, 6566, 4977, 3961, 3040], [12683, 9437, 6874, 5541, 5121, 5170, 5359, 5056]];
    var AC_TNS_ORDER_FREQ = [[3, 9, 23, 54, 111, 190, 268, 366], [14, 42, 100, 157, 181, 178, 167, 185]];
    var AC_TNS_ORDER_CUMFREQ = [[0, 3, 12, 35, 89, 200, 390, 658], [0, 14, 56, 156, 313, 494, 672, 839]];
    var AC_TNS_COEF_BITS = [[20480, 15725, 12479, 10334, 8694, 7320, 6964, 6335, 5504, 5637, 6566, 6758, 8433, 11348, 15186, 20480, 20480], [20480, 20480, 20480, 20480, 12902, 9368, 7057, 5901, 5254, 5485, 5598, 6076, 7608, 10742, 15186, 20480, 20480], [20480, 20480, 20480, 20480, 13988, 9368, 6702, 4841, 4585, 4682, 5859, 7764, 12109, 20480, 20480, 20480, 20480], [20480, 20480, 20480, 20480, 18432, 13396, 8982, 4767, 3779, 3658, 6335, 9656, 13988, 20480, 20480, 20480, 20480], [20480, 20480, 20480, 20480, 20480, 14731, 9437, 4275, 3249, 3493, 8483, 13988, 17234, 20480, 20480, 20480, 20480], [20480, 20480, 20480, 20480, 20480, 20480, 12902, 4753, 3040, 2953, 9105, 15725, 20480, 20480, 20480, 20480, 20480], [20480, 20480, 20480, 20480, 20480, 20480, 12902, 3821, 3346, 3000, 12109, 20480, 20480, 20480, 20480, 20480, 20480], [20480, 20480, 20480, 20480, 20480, 20480, 15725, 3658, 20480, 1201, 10854, 18432, 20480, 20480, 20480, 20480, 20480]];
    var AC_TNS_COEF_FREQ = [[1, 5, 15, 31, 54, 86, 97, 120, 159, 152, 111, 104, 59, 22, 6, 1, 1], [1, 1, 1, 1, 13, 43, 94, 139, 173, 160, 154, 131, 78, 27, 6, 1, 1], [1, 1, 1, 1, 9, 43, 106, 199, 217, 210, 141, 74, 17, 1, 1, 1, 1], [1, 1, 1, 1, 2, 11, 49, 204, 285, 297, 120, 39, 9, 1, 1, 1, 1], [1, 1, 1, 1, 1, 7, 42, 241, 341, 314, 58, 9, 3, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 13, 205, 366, 377, 47, 5, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 13, 281, 330, 371, 17, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 5, 297, 1, 682, 26, 2, 1, 1, 1, 1, 1]];
    var AC_TNS_COEF_CUMFREQ = [[0, 1, 6, 21, 52, 106, 192, 289, 409, 568, 720, 831, 935, 994, 1016, 1022, 1023], [0, 1, 2, 3, 4, 17, 60, 154, 293, 466, 626, 780, 911, 989, 1016, 1022, 1023], [0, 1, 2, 3, 4, 13, 56, 162, 361, 578, 788, 929, 1003, 1020, 1021, 1022, 1023], [0, 1, 2, 3, 4, 6, 17, 66, 270, 555, 852, 972, 1011, 1020, 1021, 1022, 1023], [0, 1, 2, 3, 4, 5, 12, 54, 295, 636, 950, 1008, 1017, 1020, 1021, 1022, 1023], [0, 1, 2, 3, 4, 5, 6, 19, 224, 590, 967, 1014, 1019, 1020, 1021, 1022, 1023], [0, 1, 2, 3, 4, 5, 6, 19, 300, 630, 1001, 1018, 1019, 1020, 1021, 1022, 1023], [0, 1, 2, 3, 4, 5, 6, 11, 308, 309, 991, 1017, 1019, 1020, 1021, 1022, 1023]];
    var TNS_PARAM_NUM_TNS_FILTERS = [[1, 1, 1, 2, 2], [1, 1, 1, 2, 2]];
    var TNS_PARAM_START_FREQ = [[[12, 0], [12, 0], [12, 0], [12, 160], [12, 200]], [[9, 0], [9, 0], [9, 0], [9, 120], [9, 150]]];
    var TNS_PARAM_STOP_FREQ = [[[80, 0], [160, 0], [240, 0], [160, 320], [200, 400]], [[60, 0], [120, 0], [180, 0], [120, 240], [150, 300]]];
    var TNS_PARAM_SUB_START = [[[[12, 34, 57], [0, 0, 0]], [[12, 61, 110], [0, 0, 0]], [[12, 88, 164], [0, 0, 0]], [[12, 61, 110], [160, 213, 266]], [[12, 74, 137], [200, 266, 333]]], [[[9, 26, 43], [0, 0, 0]], [[9, 46, 83], [0, 0, 0]], [[9, 66, 123], [0, 0, 0]], [[9, 46, 82], [120, 159, 200]], [[9, 56, 103], [150, 200, 250]]]];
    var TNS_PARAM_SUB_STOP = [[[[34, 57, 80], [0, 0, 0]], [[61, 110, 160], [0, 0, 0]], [[88, 164, 240], [0, 0, 0]], [[61, 110, 160], [213, 266, 320]], [[74, 137, 200], [266, 333, 400]]], [[[26, 43, 60], [0, 0, 0]], [[46, 83, 120], [0, 0, 0]], [[66, 123, 180], [0, 0, 0]], [[46, 82, 120], [159, 200, 240]], [[56, 103, 150], [200, 250, 300]]]];
    var TNS_LPC_WEIGHTING_TH = [480, 360];
    module.exports = {
      "AC_TNS_ORDER_BITS": AC_TNS_ORDER_BITS,
      "AC_TNS_ORDER_FREQ": AC_TNS_ORDER_FREQ,
      "AC_TNS_ORDER_CUMFREQ": AC_TNS_ORDER_CUMFREQ,
      "AC_TNS_COEF_BITS": AC_TNS_COEF_BITS,
      "AC_TNS_COEF_FREQ": AC_TNS_COEF_FREQ,
      "AC_TNS_COEF_CUMFREQ": AC_TNS_COEF_CUMFREQ,
      "TNS_PARAM_NUM_TNS_FILTERS": TNS_PARAM_NUM_TNS_FILTERS,
      "TNS_PARAM_START_FREQ": TNS_PARAM_START_FREQ,
      "TNS_PARAM_STOP_FREQ": TNS_PARAM_STOP_FREQ,
      "TNS_PARAM_SUB_START": TNS_PARAM_SUB_START,
      "TNS_PARAM_SUB_STOP": TNS_PARAM_SUB_STOP,
      "TNS_LPC_WEIGHTING_TH": TNS_LPC_WEIGHTING_TH
    };
  },
  "lc3/tables/w": function lc3TablesW(module, require) {
    var Lc3TblW10_80 = require("./w10_80");

    var Lc3TblW10_160 = require("./w10_160");

    var Lc3TblW10_240 = require("./w10_240");

    var Lc3TblW10_320 = require("./w10_320");

    var Lc3TblW10_480 = require("./w10_480");

    var Lc3TblW75_60 = require("./w75_60");

    var Lc3TblW75_120 = require("./w75_120");

    var Lc3TblW75_180 = require("./w75_180");

    var Lc3TblW75_240 = require("./w75_240");

    var Lc3TblW75_360 = require("./w75_360");

    var Lc3ArrayUtil = require("./../common/array_util");

    var W10_80 = Lc3TblW10_80.W10_80;
    var W10_160 = Lc3TblW10_160.W10_160;
    var W10_240 = Lc3TblW10_240.W10_240;
    var W10_320 = Lc3TblW10_320.W10_320;
    var W10_480 = Lc3TblW10_480.W10_480;
    var W75_60 = Lc3TblW75_60.W75_60;
    var W75_120 = Lc3TblW75_120.W75_120;
    var W75_180 = Lc3TblW75_180.W75_180;
    var W75_240 = Lc3TblW75_240.W75_240;
    var W75_360 = Lc3TblW75_360.W75_360;
    var ArrayFlip = Lc3ArrayUtil.ArrayFlip;
    var W_TBL = [[W10_80, W10_160, W10_240, W10_320, W10_480, W10_480], [W75_60, W75_120, W75_180, W75_240, W75_360, W75_360]];
    var W_FLIPPED_TBL = [[ArrayFlip(W10_80.slice()), ArrayFlip(W10_160.slice()), ArrayFlip(W10_240.slice()), ArrayFlip(W10_320.slice()), ArrayFlip(W10_480.slice()), ArrayFlip(W10_480.slice())], [ArrayFlip(W75_60.slice()), ArrayFlip(W75_120.slice()), ArrayFlip(W75_180.slice()), ArrayFlip(W75_240.slice()), ArrayFlip(W75_360.slice()), ArrayFlip(W75_360.slice())]];
    module.exports = {
      "W_TBL": W_TBL,
      "W_FLIPPED_TBL": W_FLIPPED_TBL
    };
  },
  "lc3/tables/w10_80": function lc3TablesW10_80(module, require) {
    var W10_80 = [-7.078546706512391e-04, -2.098197727900724e-03, -4.525198076002370e-03, -8.233976327300612e-03, -1.337713096257934e-02, -1.999721557401502e-02, -2.800909464274782e-02, -3.721502082245055e-02, -4.731768261606175e-02, -5.794654834034055e-02, -6.867606753531441e-02, -7.904647440788692e-02, -8.859705468085925e-02, -9.688303623049199e-02, -1.034961241263523e-01, -1.080766457616878e-01, -1.103242262600913e-01, -1.099809851424550e-01, -1.068172142230882e-01, -1.006190418791648e-01, -9.116452506492527e-02, -7.820617483254730e-02, -6.146688124166948e-02, -4.063362855701623e-02, -1.536329520788766e-02, +1.470155068746303e-02, +4.989736509080558e-02, +9.050369257152079e-02, +1.366911019414417e-01, +1.884686389218322e-01, +2.456456803467095e-01, +3.077789078889820e-01, +3.741642373060188e-01, +4.438114799213576e-01, +5.154735456539700e-01, +5.876661722564289e-01, +6.587619767809000e-01, +7.270576699841359e-01, +7.908752989295335e-01, +8.486643364959733e-01, +8.991320235484349e-01, +9.413348145272842e-01, +9.747634827941575e-01, +9.994114730415857e-01, +1.015760373791603e+00, +1.024736164069697e+00, +1.027634294456205e+00, +1.025991493983836e+00, +1.021427210603284e+00, +1.015439859549357e+00, +1.009366925499550e+00, +1.003508162416449e+00, +9.988898206257559e-01, +9.953133902427869e-01, +9.925943919208190e-01, +9.905771957917731e-01, +9.891371616557014e-01, +9.881790747212391e-01, +9.876249269174586e-01, +9.874056275509585e-01, +9.874524849192456e-01, +9.876951134084213e-01, +9.880640617030884e-01, +9.884926873551375e-01, +9.889230031022089e-01, +9.893074965384659e-01, +9.896146331889107e-01, +9.898319269347060e-01, +9.899693102025342e-01, +9.900603352632121e-01, +9.901575015155720e-01, +9.903255289051605e-01, +9.906303787150326e-01, +9.911298894709990e-01, +9.918665491182922e-01, +9.928619727154252e-01, +9.941156069136238e-01, +9.956033775539884e-01, +9.972793109558521e-01, +9.990784840729244e-01, +1.000922365901945e+00, +1.002728111386909e+00, +1.004416038098237e+00, +1.005919224127911e+00, +1.007189345025525e+00, +1.008200146369426e+00, +1.008949493525753e+00, +1.009458241425143e+00, +1.009768980817384e+00, +1.009940336228694e+00, +1.010039453539107e+00, +1.010132323996401e+00, +1.010272524848519e+00, +1.010494354532353e+00, +1.010808068774316e+00, +1.011201071127927e+00, +1.011641272406023e+00, +1.012080125934687e+00, +1.012458183122033e+00, +1.012706955800289e+00, +1.012755013843985e+00, +1.012530134411619e+00, +1.011962331100864e+00, +1.010982135506986e+00, +1.009512438049510e+00, +1.007460860286395e+00, +1.004708677491086e+00, +1.001111413242302e+00, +9.965041017623596e-01, +9.907199995730845e-01, +9.823765865983288e-01, +9.708821747608998e-01, +9.546732976073705e-01, +9.321553861564006e-01, +9.018003682081348e-01, +8.623984077953557e-01, +8.132817365236141e-01, +7.544551974836834e-01, +6.866580716267418e-01, +6.113488038789190e-01, +5.306181649316597e-01, +4.471309850999502e-01, +3.639114681156236e-01, +2.841647033392408e-01, +2.110209448747969e-01, +1.472287968327703e-01, +9.482665349502291e-02, +5.482436608328477e-02, +2.701461405056264e-02, +9.996743588367519e-03, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00];
    module.exports = {
      "W10_80": W10_80
    };
  },
  "lc3/tables/w10_160": function lc3TablesW10_160(module, require) {
    var W10_160 = [-4.619898752628163e-04, -9.747166718929050e-04, -1.664473096973725e-03, -2.597106916737789e-03, -3.806285163352241e-03, -5.324608721716763e-03, -7.175885277771099e-03, -9.382480860899108e-03, -1.195270300743193e-02, -1.489528159506296e-02, -1.820666399965468e-02, -2.187570925786862e-02, -2.588471937157619e-02, -3.020862738245264e-02, -3.481597793538342e-02, -3.967067992672979e-02, -4.472698045914417e-02, -4.994225863256500e-02, -5.526334794593565e-02, -6.063717235243996e-02, -6.600961519440657e-02, -7.131966266443390e-02, -7.651178225890490e-02, -8.152964005319532e-02, -8.631137544905677e-02, -9.080411291245728e-02, -9.495377758870335e-02, -9.870736514214426e-02, -1.020202684361974e-01, -1.048438825017798e-01, -1.071382314127799e-01, -1.088690135027248e-01, -1.099969655786929e-01, -1.104898474883336e-01, -1.103225838568563e-01, -1.094621746650760e-01, -1.078834293141886e-01, -1.055612509762041e-01, -1.024650162703341e-01, -9.857014566194629e-02, -9.384684920715425e-02, -8.826309993000785e-02, -8.178792716809512e-02, -7.438785600211463e-02, -6.602189797715241e-02, -5.665655641133161e-02, -4.624456893420224e-02, -3.474585776145929e-02, -2.211581608120528e-02, -8.310425696208936e-03, +6.717697635290676e-03, +2.300642061077823e-02, +4.060106462625085e-02, +5.953239090915557e-02, +7.983354189816511e-02, +1.015233140203748e-01, +1.246171387327525e-01, +1.491152519299797e-01, +1.750067399059861e-01, +2.022699854906251e-01, +2.308655379767671e-01, +2.607365124918583e-01, +2.918144694729168e-01, +3.240095704645023e-01, +3.572175180786021e-01, +3.913146885756875e-01, +4.261571642320424e-01, +4.615925445090212e-01, +4.974471592901086e-01, +5.335326819631583e-01, +5.696546730080154e-01, +6.056083823929643e-01, +6.411830842823245e-01, +6.761653499550255e-01, +7.103400549562944e-01, +7.434943718765665e-01, +7.754281892901473e-01, +8.059437233154637e-01, +8.348589373399948e-01, +8.620108336276733e-01, +8.872599706865123e-01, +9.104863121445679e-01, +9.315962496426278e-01, +9.505220861927248e-01, +9.672366712325431e-01, +9.817397501303696e-01, +9.940557180662704e-01, +1.004247514102417e+00, +1.012407428282884e+00, +1.018650990561848e+00, +1.023118841384460e+00, +1.025972450969440e+00, +1.027397523939210e+00, +1.027585830688143e+00, +1.026738673647482e+00, +1.025061777648234e+00, +1.022756514615106e+00, +1.020009139549275e+00, +1.016996499560845e+00, +1.013915946100629e+00, +1.011044869639164e+00, +1.007773858455400e+00, +1.004848753962734e+00, +1.002245009135684e+00, +9.999393169239009e-01, +9.979055415627330e-01, +9.961203379971326e-01, +9.945597525471822e-01, +9.932031606606762e-01, +9.920297273323891e-01, +9.910230654424902e-01, +9.901668953434221e-01, +9.894488374513719e-01, +9.888556356037892e-01, +9.883778520531268e-01, +9.880051626345804e-01, +9.877295459610343e-01, +9.875412739766566e-01, +9.874329809802893e-01, +9.873949921033299e-01, +9.874197049003676e-01, +9.874973205882319e-01, +9.876201238703241e-01, +9.877781920433015e-01, +9.879637979933339e-01, +9.881678007807095e-01, +9.883835200189653e-01, +9.886022219397892e-01, +9.888182771263505e-01, +9.890247977602895e-01, +9.892178658748239e-01, +9.893923680007577e-01, +9.895463342815009e-01, +9.896772011542693e-01, +9.897859195209235e-01, +9.898725363809847e-01, +9.899410789223559e-01, +9.899945557067980e-01, +9.900394023736973e-01, +9.900814722948890e-01, +9.901293790312005e-01, +9.901902265696609e-01, +9.902734448815004e-01, +9.903862280081246e-01, +9.905379830873822e-01, +9.907348826312993e-01, +9.909842592301273e-01, +9.912905118607647e-01, +9.916586940166509e-01, +9.920906151219310e-01, +9.925887208794144e-01, +9.931516528513824e-01, +9.937790866568735e-01, +9.944668184371617e-01, +9.952116634297566e-01, +9.960068616185641e-01, +9.968461329825753e-01, +9.977203369515556e-01, +9.986213520769593e-01, +9.995382582242990e-01, +1.000461955079660e+00, +1.001380551217109e+00, +1.002284871786226e+00, +1.003163845364970e+00, +1.004009147462043e+00, +1.004811375053364e+00, +1.005563968008037e+00, +1.006259855360867e+00, +1.006895570408563e+00, +1.007466616298057e+00, +1.007972441990187e+00, +1.008411468616852e+00, +1.008786009787269e+00, +1.009097763850333e+00, +1.009351762546296e+00, +1.009552401900961e+00, +1.009707093778162e+00, +1.009822090220407e+00, +1.009906958448099e+00, +1.009969021400474e+00, +1.010017890428877e+00, +1.010060809299530e+00, +1.010106564965965e+00, +1.010161131093372e+00, +1.010231078494249e+00, +1.010319484524512e+00, +1.010430470494512e+00, +1.010564099281000e+00, +1.010721360243234e+00, +1.010899655674578e+00, +1.011096993993037e+00, +1.011308167670753e+00, +1.011529185153809e+00, +1.011753008569803e+00, +1.011973876511603e+00, +1.012182837094955e+00, +1.012373028737774e+00, +1.012535058602453e+00, +1.012660975529858e+00, +1.012740575296603e+00, +1.012765922449960e+00, +1.012726958954961e+00, +1.012615904116265e+00, +1.012422888521601e+00, +1.012140460211194e+00, +1.011758810583150e+00, +1.011269960947744e+00, +1.010663676735228e+00, +1.009930754807923e+00, +1.009058249873833e+00, +1.008034308295421e+00, +1.006843352506855e+00, +1.005470005637052e+00, +1.003894772403371e+00, +1.002098854400575e+00, +1.000060686758758e+00, +9.977600196406868e-01, +9.951746430061121e-01, +9.922861082472264e-01, +9.890757868707590e-01, +9.847362453480265e-01, +9.798613526271561e-01, +9.741378617337759e-01, +9.673331975559332e-01, +9.592539757044516e-01, +9.496984081652284e-01, +9.384634163826711e-01, +9.253567968750328e-01, +9.101986790930605e-01, +8.928338316495705e-01, +8.731437835983047e-01, +8.510420440685049e-01, +8.264839911291133e-01, +7.994681492797084e-01, +7.700431275216928e-01, +7.383028603058783e-01, +7.043814340356083e-01, +6.684616478236647e-01, +6.307755329382612e-01, +5.915799587176216e-01, +5.511703155400274e-01, +5.098915423728179e-01, +4.681017110047964e-01, +4.261772971493010e-01, +3.845172335531009e-01, +3.435228672445613e-01, +3.036004651973099e-01, +2.651434678028531e-01, +2.285283969438072e-01, +1.941021906320984e-01, +1.621735416384830e-01, +1.330015240938615e-01, +1.067840430193724e-01, +8.365057236623041e-02, +6.365188111381356e-02, +4.676538412257621e-02, +3.288072750732215e-02, +2.183057564646270e-02, +1.336381425803019e-02, +6.758124889697787e-03, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00];
    module.exports = {
      "W10_160": W10_160
    };
  },
  "lc3/tables/w10_240": function lc3TablesW10_240(module, require) {
    var W10_240 = [-3.613496418928369e-04, -7.078546706512391e-04, -1.074443637110903e-03, -1.533478537964509e-03, -2.098197727900724e-03, -2.778420871815740e-03, -3.584129920673041e-03, -4.525198076002370e-03, -5.609327243712055e-03, -6.843234536105624e-03, -8.233976327300612e-03, -9.785314755557023e-03, -1.149880303071551e-02, -1.337713096257934e-02, -1.542181679511618e-02, -1.762979910961727e-02, -1.999721557401502e-02, -2.252080561390149e-02, -2.519406300389030e-02, -2.800909464274782e-02, -3.095765092956728e-02, -3.402996266948349e-02, -3.721502082245055e-02, -4.050053247568393e-02, -4.387219218706189e-02, -4.731768261606175e-02, -5.082325342672667e-02, -5.437166635159518e-02, -5.794654834034055e-02, -6.153426201732499e-02, -6.511708163113709e-02, -6.867606753531441e-02, -7.219447805250771e-02, -7.565695975592170e-02, -7.904647440788692e-02, -8.234442557322251e-02, -8.553324579905185e-02, -8.859705468085925e-02, -9.152091100798199e-02, -9.428847446755965e-02, -9.688303623049198e-02, -9.929123258537813e-02, -1.015008467688577e-01, -1.034961241263523e-01, -1.052637003544443e-01, -1.067939984687745e-01, -1.080766457616878e-01, -1.090997300590506e-01, -1.098524491515805e-01, -1.103242262600913e-01, -1.105084619148789e-01, -1.103977408741932e-01, -1.099809851424550e-01, -1.092492774392824e-01, -1.081974227416502e-01, -1.068172142230882e-01, -1.050995803285455e-01, -1.030360111111103e-01, -1.006190418791648e-01, -9.784120023411771e-02, -9.469304216883027e-02, -9.116452506492527e-02, -8.724644532866996e-02, -8.293043914044632e-02, -7.820617483254730e-02, -7.306142427456862e-02, -6.748468182105991e-02, -6.146688124166948e-02, -5.499497258200362e-02, -4.805444424454820e-02, -4.063362855701623e-02, -3.272045590229335e-02, -2.430122582451853e-02, -1.536329520788766e-02, -5.891434269890659e-03, +4.126595858583295e-03, +1.470155068746303e-02, +2.584738191459814e-02, +3.757652772246801e-02, +4.989736509080558e-02, +6.282034030592902e-02, +7.635397728566121e-02, +9.050369257152079e-02, +1.052747118478660e-01, +1.206703467513333e-01, +1.366911019414417e-01, +1.533343890681390e-01, +1.705954709184399e-01, +1.884686389218322e-01, +2.069449962574092e-01, +2.260093000067393e-01, +2.456456803467095e-01, +2.658346019332584e-01, +2.865543814049772e-01, +3.077789078889820e-01, +3.294769437072290e-01, +3.516171481750350e-01, +3.741642373060188e-01, +3.970739591211551e-01, +4.203043046885219e-01, +4.438114799213576e-01, +4.675442291623012e-01, +4.914498631045615e-01, +5.154735456539700e-01, +5.395557644293222e-01, +5.636399817032525e-01, +5.876661722564289e-01, +6.115695310143157e-01, +6.352890592874099e-01, +6.587619767809000e-01, +6.819230974423550e-01, +7.047092819314779e-01, +7.270576699841359e-01, +7.489068963384272e-01, +7.701990187606995e-01, +7.908752989295335e-01, +8.108788692151807e-01, +8.301579139160681e-01, +8.486643364959733e-01, +8.663548164329093e-01, +8.831896853053627e-01, +8.991320235484349e-01, +9.141540563656075e-01, +9.282282546151819e-01, +9.413348145272842e-01, +9.534619388400459e-01, +9.646048250501910e-01, +9.747634827941575e-01, +9.839435385219192e-01, +9.921529097154242e-01, +9.994114730415857e-01, +1.005746084650236e+00, +1.011183971347815e+00, +1.015760373791603e+00, +1.019515072412387e+00, +1.022490937034641e+00, +1.024736164069697e+00, +1.026304095700693e+00, +1.027250978292214e+00, +1.027634294456205e+00, +1.027511063644843e+00, +1.026942795115598e+00, +1.025991493983836e+00, +1.024716149969084e+00, +1.023175976163407e+00, +1.021427210603284e+00, +1.019521566634239e+00, +1.017510118327508e+00, +1.015439859549357e+00, +1.013460916839174e+00, +1.011654901040475e+00, +1.009366925499550e+00, +1.007263182132894e+00, +1.005313192386866e+00, +1.003508162416449e+00, +1.001840787319378e+00, +1.000303927234380e+00, +9.988898206257559e-01, +9.975915283480670e-01, +9.964015284765968e-01, +9.953133902427869e-01, +9.943201078053212e-01, +9.934158959186011e-01, +9.925943919208190e-01, +9.918510277326026e-01, +9.911797988363887e-01, +9.905771957917731e-01, +9.900381047643838e-01, +9.895594394179152e-01, +9.891371616557014e-01, +9.887684373604154e-01, +9.884497924570929e-01, +9.881790747212391e-01, +9.879528358230726e-01, +9.877691368590689e-01, +9.876249269174586e-01, +9.875179947346887e-01, +9.874458127312921e-01, +9.874056275509585e-01, +9.873951115886979e-01, +9.874115368168944e-01, +9.874524849192456e-01, +9.875149888347144e-01, +9.875968894760857e-01, +9.876951134084213e-01, +9.878075819424549e-01, +9.879311998177238e-01, +9.880640617030884e-01, +9.882032571565917e-01, +9.883471084085503e-01, +9.884926873551375e-01, +9.886386592120545e-01, +9.887825578295630e-01, +9.889230031022089e-01, +9.890581715933395e-01, +9.891867674284610e-01, +9.893074965384659e-01, +9.894196399062921e-01, +9.895220757174378e-01, +9.896146331889107e-01, +9.896970346678272e-01, +9.897692596535289e-01, +9.898319269347060e-01, +9.898852572653667e-01, +9.899307640365727e-01, +9.899693102025343e-01, +9.900025692522435e-01, +9.900321562263099e-01, +9.900603352632121e-01, +9.900889812894406e-01, +9.901206586012907e-01, +9.901575015155720e-01, +9.902023946214220e-01, +9.902575406142213e-01, +9.903255289051605e-01, +9.904087914462694e-01, +9.905096491583045e-01, +9.906303787150326e-01, +9.907727108894024e-01, +9.909387444078919e-01, +9.911298894709990e-01, +9.913476318763218e-01, +9.915928560402563e-01, +9.918665491182922e-01, +9.921691315380984e-01, +9.925010851461232e-01, +9.928619727154252e-01, +9.932519181564613e-01, +9.936700207375173e-01, +9.941156069136238e-01, +9.945873147903244e-01, +9.950837402063278e-01, +9.956033775539884e-01, +9.961439922621166e-01, +9.967034533921340e-01, +9.972793109558521e-01, +9.978690858367024e-01, +9.984697087896268e-01, +9.990784840729244e-01, +9.996919011206490e-01, +1.000308193833526e+00, +1.000922365901945e+00, +1.001532636590676e+00, +1.002135464655177e+00, +1.002728111386909e+00, +1.003307449770187e+00, +1.003870934089686e+00, +1.004416038098237e+00, +1.004940548815171e+00, +1.005442141810160e+00, +1.005919224127911e+00, +1.006370303149314e+00, +1.006793927824538e+00, +1.007189345025525e+00, +1.007555573455895e+00, +1.007892674961336e+00, +1.008200146369426e+00, +1.008478423284851e+00, +1.008727884997619e+00, +1.008949493525753e+00, +1.009144112734761e+00, +1.009313224929575e+00, +1.009458241425143e+00, +1.009581280555682e+00, +1.009684090687164e+00, +1.009768980817384e+00, +1.009838308708799e+00, +1.009894548257807e+00, +1.009940336228694e+00, +1.009977916643680e+00, +1.010010230290263e+00, +1.010039453539107e+00, +1.010068202038694e+00, +1.010098388689342e+00, +1.010132323996401e+00, +1.010171656775640e+00, +1.010218096148412e+00, +1.010272524848519e+00, +1.010336490294771e+00, +1.010410221483215e+00, +1.010494354532353e+00, +1.010588873699422e+00, +1.010693501186928e+00, +1.010808068774316e+00, +1.010931436739342e+00, +1.011062876503041e+00, +1.011201071127927e+00, +1.011344700694417e+00, +1.011491904228184e+00, +1.011641272406023e+00, +1.011790282474963e+00, +1.011937567254485e+00, +1.012080125934687e+00, +1.012216235487353e+00, +1.012342907951334e+00, +1.012458183122033e+00, +1.012558879696851e+00, +1.012642857380847e+00, +1.012706955800289e+00, +1.012748952907404e+00, +1.012765799894453e+00, +1.012755013843985e+00, +1.012713798678211e+00, +1.012639775003457e+00, +1.012530134411619e+00, +1.012382309473470e+00, +1.012194068117524e+00, +1.011962331100864e+00, +1.011685173724601e+00, +1.011359143572147e+00, +1.010982135506986e+00, +1.010550715971368e+00, +1.010062133151922e+00, +1.009512438049510e+00, +1.008898689394160e+00, +1.008215923600973e+00, +1.007460860286395e+00, +1.006627741823389e+00, +1.005712337656749e+00, +1.004708677491086e+00, +1.003611467285588e+00, +1.002414286392268e+00, +1.001111413242302e+00, +9.996961651093181e-01, +9.981625949525345e-01, +9.965041017623596e-01, +9.947148884277037e-01, +9.927891912841345e-01, +9.907199995730845e-01, +9.884793707533194e-01, +9.855347660016696e-01, +9.823765865983286e-01, +9.789747333404933e-01, +9.751623811486372e-01, +9.708821747608998e-01, +9.660805524695870e-01, +9.606976399184645e-01, +9.546732976073706e-01, +9.479479345282376e-01, +9.404609052933396e-01, +9.321553861564006e-01, +9.229775478442888e-01, +9.128745354570823e-01, +9.018003682081348e-01, +8.897163275605041e-01, +8.765908974996186e-01, +8.623984077953557e-01, +8.471200801854385e-01, +8.307479727020245e-01, +8.132817365236141e-01, +7.947291447585267e-01, +7.751108841891807e-01, +7.544551974836834e-01, +7.327963552921717e-01, +7.101790843209148e-01, +6.866580716267418e-01, +6.622962432368731e-01, +6.371684119604742e-01, +6.113488038789190e-01, +5.849206604934815e-01, +5.579747428663487e-01, +5.306181649316717e-01, +5.029523957059122e-01, +4.750868825511614e-01, +4.471309850999535e-01, +4.192049917945288e-01, +3.914252910998820e-01, +3.639114681156252e-01, +3.367837772954476e-01, +3.101627843160973e-01, +2.841647033392418e-01, +2.589033711808454e-01, +2.344880603710975e-01, +2.110209448747974e-01, +1.885997642296488e-01, +1.673100807904834e-01, +1.472287968327706e-01, +1.284223074167396e-01, +1.109422548710344e-01, +9.482665349502306e-02, +8.009914366829558e-02, +6.676765847398403e-02, +5.482436608328485e-02, +4.424588851571281e-02, +3.499361000717621e-02, +2.701461405056267e-02, +2.024370180670145e-02, +1.460796755137538e-02, +9.996743588367531e-03, +5.305235098871444e-03, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00];
    module.exports = {
      "W10_240": W10_240
    };
  },
  "lc3/tables/w10_320": function lc3TablesW10_320(module, require) {
    var W10_320 = [-3.021153494057143e-04, -5.867737487939294e-04, -8.366504004139796e-04, -1.126635355725494e-03, -1.470492941694331e-03, -1.873473391018495e-03, -2.339292362082021e-03, -2.872008069419264e-03, -3.476256385086407e-03, -4.155963816705528e-03, -4.914563787665504e-03, -5.755172503953251e-03, -6.680623380533122e-03, -7.693816924650567e-03, -8.796760749750191e-03, -9.990503073705982e-03, -1.127574117138621e-02, -1.265334152129685e-02, -1.412438986522702e-02, -1.568889620430290e-02, -1.734512089366117e-02, -1.909097368362797e-02, -2.092546711168754e-02, -2.284684792818856e-02, -2.485207716234951e-02, -2.693746704328349e-02, -2.909952486193999e-02, -3.133504629493832e-02, -3.363960728361352e-02, -3.600820974457969e-02, -3.843601741746971e-02, -4.091746034850161e-02, -4.344654894948344e-02, -4.601786724624048e-02, -4.862598509282497e-02, -5.126474204655663e-02, -5.392644753556616e-02, -5.660384311081047e-02, -5.929116747072080e-02, -6.198268202511926e-02, -6.467025548071184e-02, -6.734542216184526e-02, -7.000099017198280e-02, -7.263057011354321e-02, -7.522784961377151e-02, -7.778525942347714e-02, -8.029480247839878e-02, -8.274924535373614e-02, -8.514125464087215e-02, -8.746379123238275e-02, -8.971069341834263e-02, -9.187564084638347e-02, -9.395176975347193e-02, -9.593137735886889e-02, -9.780843257659243e-02, -9.957851303827886e-02, -1.012361165314596e-01, -1.027741036495644e-01, -1.041861222641119e-01, -1.054680247057000e-01, -1.066160875985523e-01, -1.076255384835563e-01, -1.084912299471198e-01, -1.092087422379003e-01, -1.097736146613313e-01, -1.101808861640070e-01, -1.104271876052675e-01, -1.105108362290460e-01, -1.104281465492726e-01, -1.101739218186236e-01, -1.097437360338336e-01, -1.091353125572511e-01, -1.083467335729228e-01, -1.073739938306107e-01, -1.062130155324388e-01, -1.048606145834788e-01, -1.033132401525343e-01, -1.015673163469357e-01, -9.962005506126154e-02, -9.746803229469267e-02, -9.510723623306666e-02, -9.253303383231506e-02, -8.974125216128212e-02, -8.672877689119252e-02, -8.349213839083708e-02, -8.002639902061687e-02, -7.632679536516856e-02, -7.238806162166744e-02, -6.820576796149519e-02, -6.377611429172260e-02, -5.909386001558149e-02, -5.415316322402774e-02, -4.894812724598650e-02, -4.347347112195197e-02, -3.772461300253332e-02, -3.169587609244436e-02, -2.538179830690266e-02, -1.877689096555516e-02, -1.187461378850388e-02, -4.669099247423082e-03, +2.844096748870385e-03, +1.066976124794342e-02, +1.881355950582949e-02, +2.728156010437695e-02, +3.607810469851272e-02, +4.520702759803914e-02, +5.467238802204326e-02, +6.447866054615346e-02, +7.462862199422061e-02, +8.512490568723846e-02, +9.596983987496970e-02, +1.071650779014335e-01, +1.187115850305241e-01, +1.306101067250375e-01, +1.428596447589721e-01, +1.554584725339102e-01, +1.684041609371527e-01, +1.816947894623263e-01, +1.953273880886783e-01, +2.092963206850239e-01, +2.235945635254679e-01, +2.382160219461597e-01, +2.531529721334063e-01, +2.683961570569586e-01, +2.839361392493072e-01, +2.997624255177811e-01, +3.158619077906196e-01, +3.322210551086769e-01, +3.488264676990591e-01, +3.656640377499646e-01, +3.827152968157059e-01, +3.999611859760947e-01, +4.173843265025887e-01, +4.349669624916473e-01, +4.526876397402144e-01, +4.705242008503956e-01, +4.884539254831315e-01, +5.064545550235134e-01, +5.245006748662190e-01, +5.425674372882107e-01, +5.606312044701524e-01, +5.786672646386708e-01, +5.966477035050948e-01, +6.145458904162185e-01, +6.323361944662236e-01, +6.499926319211774e-01, +6.674874032292857e-01, +6.847932667399612e-01, +7.018835463513400e-01, +7.187322544823347e-01, +7.353128213893310e-01, +7.516001985652684e-01, +7.675699252273948e-01, +7.831974571624924e-01, +7.984583859818390e-01, +8.133295347030278e-01, +8.277892271515950e-01, +8.418178561101360e-01, +8.553961300139363e-01, +8.685068980898102e-01, +8.811334436653052e-01, +8.932596784799233e-01, +9.048748835980528e-01, +9.159657608120536e-01, +9.265215299450000e-01, +9.365339988633418e-01, +9.459977028429117e-01, +9.549088408436811e-01, +9.632658122557368e-01, +9.710688896122810e-01, +9.783204156360773e-01, +9.850226760127131e-01, +9.911792082081333e-01, +9.967989944502682e-01, +1.001894024615659e+00, +1.006474342231823e+00, +1.010552057109195e+00, +1.014142538208007e+00, +1.017262593268930e+00, +1.019928842669923e+00, +1.022159867011177e+00, +1.023976320927187e+00, +1.025400734608122e+00, +1.026455340400072e+00, +1.027164510654160e+00, +1.027552729180790e+00, +1.027644462380432e+00, +1.027463246660797e+00, +1.027035903410657e+00, +1.026389068000259e+00, +1.025548201799728e+00, +1.024537134749709e+00, +1.023380803775376e+00, +1.022103695693341e+00, +1.020728359657958e+00, +1.019275334687329e+00, +1.017765178792830e+00, +1.016217355867531e+00, +1.014665311686846e+00, +1.013249071090664e+00, +1.011948006992127e+00, +1.010189090179223e+00, +1.008557961167850e+00, +1.007011287608451e+00, +1.005548764575910e+00, +1.004168417268956e+00, +1.002867268893035e+00, +1.001641769115897e+00, +1.000489068954641e+00, +9.994060799749374e-01, +9.983898865406841e-01, +9.974370849972721e-01, +9.965444836911705e-01, +9.957098545943852e-01, +9.949302413030897e-01, +9.942024045863540e-01, +9.935241604969254e-01, +9.928930430130044e-01, +9.923068103443909e-01, +9.917633778190438e-01, +9.912597642374404e-01, +9.907954498484041e-01, +9.903677893656558e-01, +9.899751611066148e-01, +9.896160337369861e-01, +9.892890160408989e-01, +9.889928511129679e-01, +9.887260333430423e-01, +9.884868721088945e-01, +9.882751039537586e-01, +9.880892168751595e-01, +9.879277114724612e-01, +9.877898261218510e-01, +9.876743442038471e-01, +9.875807496078497e-01, +9.875072021876561e-01, +9.874529447589979e-01, +9.874169741527905e-01, +9.873984685207834e-01, +9.873958301311858e-01, +9.874080027710336e-01, +9.874343401290739e-01, +9.874736235387018e-01, +9.875243137719285e-01, +9.875856201221135e-01, +9.876563785063032e-01, +9.877358921155149e-01, +9.878225576787804e-01, +9.879150968481590e-01, +9.880132731565830e-01, +9.881156946084619e-01, +9.882211314188272e-01, +9.883289032519310e-01, +9.884378310018685e-01, +9.885476787868710e-01, +9.886568414746639e-01, +9.887645868459630e-01, +9.888708540445242e-01, +9.889744320992592e-01, +9.890747269455915e-01, +9.891710038703801e-01, +9.892631024032380e-01, +9.893507219573624e-01, +9.894330645494204e-01, +9.895096919388534e-01, +9.895810813422480e-01, +9.896467469067676e-01, +9.897067365020641e-01, +9.897606930400666e-01, +9.898094478563998e-01, +9.898530133261707e-01, +9.898914705684924e-01, +9.899254194103574e-01, +9.899554202030650e-01, +9.899824494486951e-01, +9.900065116928948e-01, +9.900284805353695e-01, +9.900497484789281e-01, +9.900709561632662e-01, +9.900928358611601e-01, +9.901163920607219e-01, +9.901427479709606e-01, +9.901734275350572e-01, +9.902087332329851e-01, +9.902498637985275e-01, +9.902983686695558e-01, +9.903548501470234e-01, +9.904205084933333e-01, +9.904959297726740e-01, +9.905825150202904e-01, +9.906812569810133e-01, +9.907922087340426e-01, +9.909165464981378e-01, +9.910550740962871e-01, +9.912084614290896e-01, +9.913768610980639e-01, +9.915605826937839e-01, +9.917604214872976e-01, +9.919767175562684e-01, +9.922091101818779e-01, +9.924579135466506e-01, +9.927231225056266e-01, +9.930049538427406e-01, +9.933027281437943e-01, +9.936161084869942e-01, +9.939453714404443e-01, +9.942895145656371e-01, +9.946481676207727e-01, +9.950203031067961e-01, +9.954058173659507e-01, +9.958038713694317e-01, +9.962130271017117e-01, +9.966324689957675e-01, +9.970615306490058e-01, +9.974990583293081e-01, +9.979437430375855e-01, +9.983940572002874e-01, +9.988493116887893e-01, +9.993083430214909e-01, +9.997689221333534e-01, +1.000231131275969e+00, +1.000692135698996e+00, +1.001152013920163e+00, +1.001608526000461e+00, +1.002060493867275e+00, +1.002507212061815e+00, +1.002947129400411e+00, +1.003378909587027e+00, +1.003801368578070e+00, +1.004213810320699e+00, +1.004615386562846e+00, +1.005004618375781e+00, +1.005380628601598e+00, +1.005743282364652e+00, +1.006091510392348e+00, +1.006424907424988e+00, +1.006742427727669e+00, +1.007044321511378e+00, +1.007330218597112e+00, +1.007599401798709e+00, +1.007852064386603e+00, +1.008088176165563e+00, +1.008308033204578e+00, +1.008511247273756e+00, +1.008698144207627e+00, +1.008869515256392e+00, +1.009025659761512e+00, +1.009166718967367e+00, +1.009293362609020e+00, +1.009406398832440e+00, +1.009507017171120e+00, +1.009595264293017e+00, +1.009672145744679e+00, +1.009739084785160e+00, +1.009796675060142e+00, +1.009846137382005e+00, +1.009888083631667e+00, +1.009924092276850e+00, +1.009955384765721e+00, +1.009982268770147e+00, +1.010006298177305e+00, +1.010028618428735e+00, +1.010050254076988e+00, +1.010071952131355e+00, +1.010094366238073e+00, +1.010118917317053e+00, +1.010146497096682e+00, +1.010177110711677e+00, +1.010211755260102e+00, +1.010251003469427e+00, +1.010295468653759e+00, +1.010345234996637e+00, +1.010400316698172e+00, +1.010461564316351e+00, +1.010528615445659e+00, +1.010601521285347e+00, +1.010679788081867e+00, +1.010763905869062e+00, +1.010853429760676e+00, +1.010947547074519e+00, +1.011045953108263e+00, +1.011148486293359e+00, +1.011254397791134e+00, +1.011363082075863e+00, +1.011473302008831e+00, +1.011584996312149e+00, +1.011697416504599e+00, +1.011808919793469e+00, +1.011919264025716e+00, +1.012027240794153e+00, +1.012132151631041e+00, +1.012232734564333e+00, +1.012327560477901e+00, +1.012416383754384e+00, +1.012497890726292e+00, +1.012570434021054e+00, +1.012633295255708e+00, +1.012685277016726e+00, +1.012725564992284e+00, +1.012752577651415e+00, +1.012765062889864e+00, +1.012762356719162e+00, +1.012743376077777e+00, +1.012706484200181e+00, +1.012650842226435e+00, +1.012575427778520e+00, +1.012479473490919e+00, +1.012361105121003e+00, +1.012219809594718e+00, +1.012054359992419e+00, +1.011864000215460e+00, +1.011647223869087e+00, +1.011402518267713e+00, +1.011129654652857e+00, +1.010826951260377e+00, +1.010492924436361e+00, +1.010126353960416e+00, +1.009725892479312e+00, +1.009290060983833e+00, +1.008817301052548e+00, +1.008305027555130e+00, +1.007752833675443e+00, +1.007157827358150e+00, +1.006518049344503e+00, +1.005831403532018e+00, +1.005095592119373e+00, +1.004308630055050e+00, +1.003467498305776e+00, +1.002569500413888e+00, +1.001612710105563e+00, +1.000594272975683e+00, +9.995111701168786e-01, +9.983609218719522e-01, +9.971409288327860e-01, +9.958488863050556e-01, +9.944818543153893e-01, +9.930375282832211e-01, +9.915146560759479e-01, +9.899136802423638e-01, +9.881930623810997e-01, +9.859422591203311e-01, +9.835667898378924e-01, +9.811423034808365e-01, +9.785214441250228e-01, +9.756636036109838e-01, +9.725453442532574e-01, +9.691456634185092e-01, +9.654406178310209e-01, +9.614043615076308e-01, +9.570113065179300e-01, +9.522367669696690e-01, +9.470548839544214e-01, +9.414403740008491e-01, +9.353691612846549e-01, +9.288190093977164e-01, +9.217662887169115e-01, +9.141896283466009e-01, +9.060694681113471e-01, +8.973891675497357e-01, +8.881332000806269e-01, +8.782893885841422e-01, +8.678469565343039e-01, +8.567970644671067e-01, +8.451334654019180e-01, +8.328542805780399e-01, +8.199594783897041e-01, +8.064511006873497e-01, +7.923346478686025e-01, +7.776204488292163e-01, +7.623206183595970e-01, +7.464486491227057e-01, +7.300205729992958e-01, +7.130567383226717e-01, +6.955805444755916e-01, +6.776173229836567e-01, +6.591955305148172e-01, +6.403486426892321e-01, +6.211072197441818e-01, +6.015049275244730e-01, +5.815787608870452e-01, +5.613674511156324e-01, +5.409188627354076e-01, +5.202736834971303e-01, +4.994780733459294e-01, +4.785774177949064e-01, +4.576172599874928e-01, +4.366490208265804e-01, +4.157221460415995e-01, +3.948856590950757e-01, +3.741903189229770e-01, +3.536868899553974e-01, +3.334260017756462e-01, +3.134586473252229e-01, +2.938337904395871e-01, +2.745992637590817e-01, +2.558030636168172e-01, +2.374902188466697e-01, +2.197036032185785e-01, +2.024855415115456e-01, +1.858749915117319e-01, +1.699067802117410e-01, +1.546132267478873e-01, +1.400238206749695e-01, +1.261637395672913e-01, +1.130534434072719e-01, +1.007084973747940e-01, +8.914024389873081e-02, +7.835612100141792e-02, +6.835821233920988e-02, +5.914211536028976e-02, +5.069893012340832e-02, +4.301717763585550e-02, +3.608020726673359e-02, +2.986316337017630e-02, +2.433722657129812e-02, +1.947675241971700e-02, +1.525710171255895e-02, +1.163787492636240e-02, +8.433087782643718e-03, +4.449668997344735e-03, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00];
    module.exports = {
      "W10_320": W10_320
    };
  },
  "lc3/tables/w10_480": function lc3TablesW10_480(module, require) {
    var W10_480 = [-2.353032150516754e-04, -4.619898752628163e-04, -6.262931535610879e-04, -7.929180432976445e-04, -9.747166718929050e-04, -1.180256894474562e-03, -1.409209039594871e-03, -1.664473096973725e-03, -1.946591608170231e-03, -2.257081732588478e-03, -2.597106916737789e-03, -2.967607624839524e-03, -3.370454877988472e-03, -3.806285163352241e-03, -4.276873767639064e-03, -4.782469904501813e-03, -5.324608721716763e-03, -5.903403814095400e-03, -6.520419726599805e-03, -7.175885277771099e-03, -7.871422820642307e-03, -8.606586039759667e-03, -9.382480860899108e-03, -1.019827182163307e-02, -1.105520547739066e-02, -1.195270300743193e-02, -1.289205910303846e-02, -1.387263484323160e-02, -1.489528159506296e-02, -1.595856621933800e-02, -1.706288556735433e-02, -1.820666399965468e-02, -1.939065975232718e-02, -2.061355417582714e-02, -2.187570925786862e-02, -2.317526315266411e-02, -2.451227449041489e-02, -2.588471937157619e-02, -2.729263737090799e-02, -2.873390902713615e-02, -3.020862738245264e-02, -3.171440372994384e-02, -3.325098858986303e-02, -3.481597793538342e-02, -3.640892406933019e-02, -3.802742318209150e-02, -3.967067992672979e-02, -4.133575417353826e-02, -4.302203371734278e-02, -4.472698045914417e-02, -4.645022292934329e-02, -4.818891490266687e-02, -4.994225863256500e-02, -5.170690802826666e-02, -5.348162036097223e-02, -5.526334794593565e-02, -5.705123152423822e-02, -5.884271749745559e-02, -6.063717235243996e-02, -6.243104027829089e-02, -6.422303545004304e-02, -6.600961519440657e-02, -6.778962269634495e-02, -6.955996868581379e-02, -7.131966266443390e-02, -7.306581273272733e-02, -7.479758913001458e-02, -7.651178225890490e-02, -7.820711420768856e-02, -7.988010693411644e-02, -8.152964005319532e-02, -8.315237353264004e-02, -8.474728946770714e-02, -8.631137544905677e-02, -8.784374452959058e-02, -8.934164364321417e-02, -9.080411291245728e-02, -9.222795761428432e-02, -9.361232867223340e-02, -9.495377758870335e-02, -9.625155313139856e-02, -9.750284620437569e-02, -9.870736514214426e-02, -9.986271288271026e-02, -1.009680221406219e-01, -1.020202684361974e-01, -1.030183804850491e-01, -1.039596356759290e-01, -1.048438825017798e-01, -1.056686838192766e-01, -1.064342821660323e-01, -1.071382314127799e-01, -1.077799961121537e-01, -1.083570625865931e-01, -1.088690135027248e-01, -1.093135588677235e-01, -1.096903559498340e-01, -1.099969655786929e-01, -1.102332261219973e-01, -1.103972812085189e-01, -1.104898474883336e-01, -1.105086416532167e-01, -1.104537426996073e-01, -1.103225838568563e-01, -1.101145827722143e-01, -1.098276928170364e-01, -1.094621746650760e-01, -1.090163960055733e-01, -1.084908852561722e-01, -1.078834293141886e-01, -1.071937180231978e-01, -1.064196358069465e-01, -1.055612509762041e-01, -1.046162812518618e-01, -1.035849043557610e-01, -1.024650162703341e-01, -1.012568997532046e-01, -9.995864571932928e-02, -9.857014566194627e-02, -9.708911135857967e-02, -9.551545820689084e-02, -9.384684920715425e-02, -9.208300062891550e-02, -9.022171021406450e-02, -8.826309993000785e-02, -8.620493821803937e-02, -8.404742152815330e-02, -8.178792716809512e-02, -7.942625026703617e-02, -7.695980775819990e-02, -7.438785600211463e-02, -7.170797002873608e-02, -6.891994783815969e-02, -6.602189797715241e-02, -6.301349420724424e-02, -5.989191912667712e-02, -5.665655641133161e-02, -5.330406164482222e-02, -4.983427241976235e-02, -4.624456893420224e-02, -4.253455686336916e-02, -3.870195772538443e-02, -3.474585776145929e-02, -3.066341518682682e-02, -2.645425077642105e-02, -2.211581608120528e-02, -1.764740541599136e-02, -1.304581363895818e-02, -8.310425696208936e-03, -3.438268661133170e-03, +1.570315476576933e-03, +6.717697635290676e-03, +1.200477020244778e-02, +1.743398319747869e-02, +2.300642061077823e-02, +2.872481423270595e-02, +3.458896350634671e-02, +4.060106462625085e-02, +4.676102915752826e-02, +5.307133911821893e-02, +5.953239090915557e-02, +6.614647812869151e-02, +7.291293184312803e-02, +7.983354189816511e-02, +8.690807412770696e-02, +9.413813765275064e-02, +1.015233140203748e-01, +1.090651518336202e-01, +1.167626546016197e-01, +1.246171387327525e-01, +1.326272948938113e-01, +1.407938190608664e-01, +1.491152519299797e-01, +1.575921408388593e-01, +1.662224799248571e-01, +1.750067399059861e-01, +1.839431938620024e-01, +1.930318183054904e-01, +2.022699854906251e-01, +2.116567430906184e-01, +2.211888523410642e-01, +2.308655379767671e-01, +2.406837992341654e-01, +2.506420640291662e-01, +2.607365124918583e-01, +2.709659073501196e-01, +2.813259021832532e-01, +2.918144694729168e-01, +3.024270279840051e-01, +3.131603499997996e-01, +3.240095704645023e-01, +3.349719592361666e-01, +3.460422935204829e-01, +3.572175180786021e-01, +3.684915649120530e-01, +3.798595119591716e-01, +3.913146885756875e-01, +4.028532873867052e-01, +4.144688328137527e-01, +4.261571642320424e-01, +4.379113897565727e-01, +4.497256320417501e-01, +4.615925445090212e-01, +4.735067030065239e-01, +4.854600184866710e-01, +4.974471592901086e-01, +5.094597228333853e-01, +5.214909841729947e-01, +5.335326819631583e-01, +5.455789811615239e-01, +5.576217157959890e-01, +5.696546730080154e-01, +5.816685576268035e-01, +5.936560624526468e-01, +6.056083823929643e-01, +6.175192060085208e-01, +6.293796611336280e-01, +6.411830842823245e-01, +6.529203544876097e-01, +6.645840786371451e-01, +6.761653499550255e-01, +6.876573952173626e-01, +6.990511539119996e-01, +7.103400549562944e-01, +7.215149331458728e-01, +7.325691772738999e-01, +7.434943718765665e-01, +7.542846327442048e-01, +7.649313654540612e-01, +7.754281892901473e-01, +7.857670170752049e-01, +7.959414651061612e-01, +8.059437233154637e-01, +8.157687070715176e-01, +8.254086223972127e-01, +8.348589373399948e-01, +8.441125827416620e-01, +8.531651194538425e-01, +8.620108336276733e-01, +8.706456337542150e-01, +8.790631561061171e-01, +8.872599706865123e-01, +8.952313288619367e-01, +9.029751680353524e-01, +9.104863121445679e-01, +9.177625550620636e-01, +9.247997426966093e-01, +9.315962496426278e-01, +9.381494858921667e-01, +9.444588390359354e-01, +9.505220861927248e-01, +9.563402921286364e-01, +9.619114522936701e-01, +9.672366712325431e-01, +9.723156637834687e-01, +9.771501187120180e-01, +9.817397501303696e-01, +9.860865871353246e-01, +9.901906380163595e-01, +9.940557180662704e-01, +9.976842395284637e-01, +1.001080961257010e+00, +1.004247514102417e+00, +1.007188578458507e+00, +1.009906654565108e+00, +1.012407428282884e+00, +1.014694702432600e+00, +1.016774659209400e+00, +1.018650990561848e+00, +1.020330464463111e+00, +1.021817328911793e+00, +1.023118841384460e+00, +1.024240262467000e+00, +1.025189721888128e+00, +1.025972450969440e+00, +1.026596938589443e+00, +1.027069179375841e+00, +1.027397523939210e+00, +1.027587902203109e+00, +1.027648951922701e+00, +1.027585830688143e+00, +1.027408519661012e+00, +1.027122986826984e+00, +1.026738673647482e+00, +1.026261663878092e+00, +1.025701002415063e+00, +1.025061777648234e+00, +1.024353980976701e+00, +1.023582385618774e+00, +1.022756514615106e+00, +1.021880604350422e+00, +1.020963871317665e+00, +1.020009139549275e+00, +1.019027285501251e+00, +1.018019442784231e+00, +1.016996499560845e+00, +1.015957433206324e+00, +1.014923441259795e+00, +1.013915946100629e+00, +1.013047565149327e+00, +1.012216130365610e+00, +1.011044869639164e+00, +1.009914592130044e+00, +1.008824888092573e+00, +1.007773858455400e+00, +1.006761700412993e+00, +1.005786648810854e+00, +1.004848753962734e+00, +1.003946083413733e+00, +1.003078846506546e+00, +1.002245009135684e+00, +1.001444733905817e+00, +1.000676188436651e+00, +9.999393169239009e-01, +9.992320848298057e-01, +9.985548127155425e-01, +9.979055415627330e-01, +9.972842679758880e-01, +9.966890948441745e-01, +9.961203379971326e-01, +9.955761256313581e-01, +9.950565724564597e-01, +9.945597525471822e-01, +9.940860378486615e-01, +9.936337788972491e-01, +9.932031606606759e-01, +9.927921871265732e-01, +9.924015177880798e-01, +9.920297273323891e-01, +9.916767775088281e-01, +9.913408767719142e-01, +9.910230654424902e-01, +9.907216425865902e-01, +9.904366799536263e-01, +9.901668953434221e-01, +9.899131011580791e-01, +9.896735637374597e-01, +9.894488374513719e-01, +9.892374835404283e-01, +9.890401927796704e-01, +9.888556356037892e-01, +9.886843467692753e-01, +9.885247606051014e-01, +9.883778520531268e-01, +9.882423270582524e-01, +9.881185638915363e-01, +9.880051626345804e-01, +9.879032023766432e-01, +9.878111744348976e-01, +9.877295459610343e-01, +9.876571983429736e-01, +9.875949843246187e-01, +9.875412739766566e-01, +9.874969061399389e-01, +9.874606249127551e-01, +9.874329809802893e-01, +9.874126414437681e-01, +9.874004750404033e-01, +9.873949921033299e-01, +9.873969162747074e-01, +9.874049060317581e-01, +9.874197049003676e-01, +9.874399717110517e-01, +9.874663281231737e-01, +9.874973205882319e-01, +9.875338926695315e-01, +9.875746535410983e-01, +9.876201238703241e-01, +9.876689801932402e-01, +9.877221556193183e-01, +9.877781920433015e-01, +9.878376489591358e-01, +9.878991990245439e-01, +9.879637979933339e-01, +9.880300303653743e-01, +9.880984675859855e-01, +9.881678007807095e-01, +9.882390300097154e-01, +9.883107693992456e-01, +9.883835200189653e-01, +9.884560159878955e-01, +9.885294200392185e-01, +9.886022219397892e-01, +9.886749404176028e-01, +9.887466261142505e-01, +9.888182771263505e-01, +9.888882480852147e-01, +9.889574384705896e-01, +9.890247977602895e-01, +9.890911247701029e-01, +9.891551701556196e-01, +9.892178658748239e-01, +9.892779555818088e-01, +9.893365186903538e-01, +9.893923680007577e-01, +9.894462830852175e-01, +9.894972124952000e-01, +9.895463342815009e-01, +9.895923617530382e-01, +9.896362652966239e-01, +9.896772011542693e-01, +9.897162195263046e-01, +9.897520286480039e-01, +9.897859195209235e-01, +9.898170267411330e-01, +9.898462068764986e-01, +9.898725363809847e-01, +9.898975138787787e-01, +9.899200050208486e-01, +9.899410789223559e-01, +9.899600605054418e-01, +9.899782261038060e-01, +9.899945557067980e-01, +9.900103500807507e-01, +9.900248320990181e-01, +9.900394023736973e-01, +9.900532105829365e-01, +9.900674746047259e-01, +9.900814722948890e-01, +9.900966926051257e-01, +9.901122448734595e-01, +9.901293790312005e-01, +9.901474648912307e-01, +9.901680598867444e-01, +9.901902265696609e-01, +9.902151896501201e-01, +9.902424418296485e-01, +9.902734448815004e-01, +9.903071270768942e-01, +9.903448913950654e-01, +9.903862280081246e-01, +9.904324484666853e-01, +9.904825650601110e-01, +9.905379830873822e-01, +9.905980602136440e-01, +9.906640366554630e-01, +9.907348826312993e-01, +9.908120376822228e-01, +9.908947858311721e-01, +9.909842592301273e-01, +9.910795247770178e-01, +9.911819240108124e-01, +9.912905118607647e-01, +9.914064705361564e-01, +9.915288011543961e-01, +9.916586940166509e-01, +9.917952720685562e-01, +9.919396217291009e-01, +9.920906151219310e-01, +9.922495028313456e-01, +9.924152398352751e-01, +9.925887208794144e-01, +9.927688708468421e-01, +9.929569112537944e-01, +9.931516528513824e-01, +9.933539244159140e-01, +9.935626893131695e-01, +9.937790866568735e-01, +9.940016434044485e-01, +9.942312024833810e-01, +9.944668184371617e-01, +9.947093441694513e-01, +9.949572854565533e-01, +9.952116634297566e-01, +9.954712635321227e-01, +9.957367951478069e-01, +9.960068616185641e-01, +9.962823025614079e-01, +9.965617986382630e-01, +9.968461329825753e-01, +9.971338271912752e-01, +9.974256691222113e-01, +9.977203369515556e-01, +9.980185087055744e-01, +9.983185871761977e-01, +9.986213520769593e-01, +9.989255426466267e-01, +9.992317314100975e-01, +9.995382582242990e-01, +9.998461160718275e-01, +1.000153907612080e+00, +1.000461955079660e+00, +1.000768859280338e+00, +1.001075613053728e+00, +1.001380551217109e+00, +1.001684244734497e+00, +1.001985425397567e+00, +1.002284871786226e+00, +1.002580975161843e+00, +1.002874411368430e+00, +1.003163845364970e+00, +1.003450063374329e+00, +1.003731570287893e+00, +1.004009147462043e+00, +1.004281457582935e+00, +1.004549339226336e+00, +1.004811375053364e+00, +1.005068272394360e+00, +1.005318795748286e+00, +1.005563968008037e+00, +1.005802269635282e+00, +1.006034554002353e+00, +1.006259855360867e+00, +1.006479018139540e+00, +1.006690541428116e+00, +1.006895570408563e+00, +1.007093045696527e+00, +1.007283799246233e+00, +1.007466616298057e+00, +1.007642728426847e+00, +1.007811036585595e+00, +1.007972441990187e+00, +1.008125875904472e+00, +1.008272602383284e+00, +1.008411468616852e+00, +1.008543573152632e+00, +1.008668018334797e+00, +1.008786009787269e+00, +1.008896526233555e+00, +1.009000766336071e+00, +1.009097763850333e+00, +1.009188880897370e+00, +1.009273163797313e+00, +1.009351762546296e+00, +1.009423944949143e+00, +1.009491175244507e+00, +1.009552401900961e+00, +1.009608886895764e+00, +1.009659973830751e+00, +1.009707093778162e+00, +1.009749238562067e+00, +1.009787744284661e+00, +1.009822090220407e+00, +1.009853706282597e+00, +1.009881498943010e+00, +1.009906958448099e+00, +1.009929567021562e+00, +1.009950573483366e+00, +1.009969021400474e+00, +1.009986499185054e+00, +1.010002363879044e+00, +1.010017890428877e+00, +1.010032170180360e+00, +1.010046722045583e+00, +1.010060809299530e+00, +1.010075674445289e+00, +1.010090449982098e+00, +1.010106564965965e+00, +1.010123226584120e+00, +1.010141762173145e+00, +1.010161131093372e+00, +1.010182635897876e+00, +1.010205587931660e+00, +1.010231078494249e+00, +1.010257950227988e+00, +1.010287732968580e+00, +1.010319484524512e+00, +1.010354079663767e+00, +1.010390635488037e+00, +1.010430470494512e+00, +1.010472266495074e+00, +1.010517096381509e+00, +1.010564099281000e+00, +1.010614266894512e+00, +1.010666285876455e+00, +1.010721360243234e+00, +1.010778416755264e+00, +1.010838252644461e+00, +1.010899655674578e+00, +1.010963729626641e+00, +1.011029191301694e+00, +1.011096993993037e+00, +1.011165861239173e+00, +1.011236610341260e+00, +1.011308167670753e+00, +1.011381453638912e+00, +1.011454785713102e+00, +1.011529185153809e+00, +1.011603680910505e+00, +1.011678803938046e+00, +1.011753008569803e+00, +1.011827484797985e+00, +1.011900936547881e+00, +1.011973876511603e+00, +1.012044885003304e+00, +1.012114985644919e+00, +1.012182837094955e+00, +1.012249023976742e+00, +1.012312095063070e+00, +1.012373028737774e+00, +1.012430463679316e+00, +1.012484972246822e+00, +1.012535058602453e+00, +1.012581678169188e+00, +1.012623472898504e+00, +1.012660975529858e+00, +1.012692758750213e+00, +1.012719789201144e+00, +1.012740575296603e+00, +1.012755753887085e+00, +1.012763948841204e+00, +1.012765922449960e+00, +1.012760298661069e+00, +1.012747819936584e+00, +1.012726958954961e+00, +1.012698607692183e+00, +1.012661400539405e+00, +1.012615904116265e+00, +1.012560833005713e+00, +1.012497050269805e+00, +1.012422888521601e+00, +1.012339226241367e+00, +1.012244921966297e+00, +1.012140460211194e+00, +1.012024302085441e+00, +1.011897560567707e+00, +1.011758810583150e+00, +1.011608449127642e+00, +1.011445162723270e+00, +1.011269960947744e+00, +1.011081255645969e+00, +1.010879608424312e+00, +1.010663676735228e+00, +1.010434184200640e+00, +1.010189681124657e+00, +1.009930754807923e+00, +1.009655660215271e+00, +1.009365251564694e+00, +1.009058249873833e+00, +1.008734758578989e+00, +1.008393079963091e+00, +1.008034308295421e+00, +1.007656661215973e+00, +1.007260142622887e+00, +1.006843352506855e+00, +1.006407009542103e+00, +1.005949145170711e+00, +1.005470005637052e+00, +1.004967986424467e+00, +1.004443531995945e+00, +1.003894772403371e+00, +1.003321903663793e+00, +1.002723127308148e+00, +1.002098854400575e+00, +1.001447278873483e+00, +1.000768505317086e+00, +1.000060686758758e+00, +9.993242684851855e-01, +9.985573503390627e-01, +9.977600196406868e-01, +9.969306036935497e-01, +9.960694269553644e-01, +9.951746430061121e-01, +9.942466438407230e-01, +9.932837131068657e-01, +9.922861082472264e-01, +9.912523092989319e-01, +9.901827419790691e-01, +9.890757868707590e-01, +9.879313024174022e-01, +9.863553220272523e-01, +9.847362453480265e-01, +9.831750948772566e-01, +9.815583336011345e-01, +9.798613526271561e-01, +9.780617486993630e-01, +9.761574317374303e-01, +9.741378617337759e-01, +9.719990112065752e-01, +9.697327413658168e-01, +9.673331975559332e-01, +9.647915124057732e-01, +9.621011497566145e-01, +9.592539757044516e-01, +9.562427177295731e-01, +9.530600909726344e-01, +9.496984081652284e-01, +9.461498120176854e-01, +9.424071613625743e-01, +9.384634163826711e-01, +9.343112966094085e-01, +9.299449872197452e-01, +9.253567968750328e-01, +9.205404627076625e-01, +9.154896280575360e-01, +9.101986790930605e-01, +9.046620597741508e-01, +8.988755194372424e-01, +8.928338316495705e-01, +8.865337190368053e-01, +8.799712722567934e-01, +8.731437835983047e-01, +8.660476534563131e-01, +8.586812520174252e-01, +8.510420440685049e-01, +8.431297226886574e-01, +8.349435141989714e-01, +8.264839911291133e-01, +8.177505366573690e-01, +8.087449817124315e-01, +7.994681492797084e-01, +7.899235162194718e-01, +7.801137731566502e-01, +7.700431275216928e-01, +7.597145736971065e-01, +7.491330971820804e-01, +7.383028603058783e-01, +7.272298755824693e-01, +7.159201919962611e-01, +7.043814340356083e-01, +6.926196927377140e-01, +6.806438831866077e-01, +6.684616478236647e-01, +6.560830137986515e-01, +6.435179268559957e-01, +6.307755329382612e-01, +6.178641647786525e-01, +6.047954625702541e-01, +5.915799587176216e-01, +5.782289366005894e-01, +5.647535885752191e-01, +5.511703155400274e-01, +5.374905090437071e-01, +5.237263500445715e-01, +5.098915423728255e-01, +4.960008074926423e-01, +4.820662943337458e-01, +4.681017110048007e-01, +4.541216995958746e-01, +4.401421815729068e-01, +4.261772971493010e-01, +4.122417888542512e-01, +3.983499612526493e-01, +3.845172335531009e-01, +3.707583717376236e-01, +3.570886786795506e-01, +3.435228672445627e-01, +3.300763764703638e-01, +3.167640325043893e-01, +3.036004651973109e-01, +2.905996158436682e-01, +2.777758503744847e-01, +2.651434678028531e-01, +2.527161881181577e-01, +2.405069849650012e-01, +2.285283969438072e-01, +2.167933432162879e-01, +2.053139897833021e-01, +1.941021906320988e-01, +1.831680872008943e-01, +1.725221947208913e-01, +1.621735416384834e-01, +1.521320683467849e-01, +1.424052801149985e-01, +1.330015240938615e-01, +1.239260664828526e-01, +1.151858295527293e-01, +1.067840430193724e-01, +9.872637505002878e-02, +9.101379000888035e-02, +8.365057236623055e-02, +7.663508305536153e-02, +6.997033405748826e-02, +6.365188111381365e-02, +5.768176015814392e-02, +5.205244216987966e-02, +4.676538412257621e-02, +4.180950541438362e-02, +3.718640251368464e-02, +3.288072750732215e-02, +2.889548499582958e-02, +2.520980565928884e-02, +2.183057564646272e-02, +1.872896194002638e-02, +1.592127815153420e-02, +1.336381425803020e-02, +1.108558877807282e-02, +8.943474189364638e-03, +6.758124889697787e-03, +3.504438130619497e-03, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00, +0.000000000000000e+00];
    module.exports = {
      "W10_480": W10_480
    };
  },
  "lc3/tables/w75_60": function lc3TablesW75_60(module, require) {
    var W75_60 = [2.950608593187313e-03, 7.175411316438510e-03, 1.376953735371754e-02, 2.309535564877266e-02, 3.540362298325999e-02, 5.082893035710152e-02, 6.946962925951473e-02, 9.138842778133426e-02, 1.166045748296231e-01, 1.450735459839195e-01, 1.767111740534608e-01, 2.113429529554800e-01, 2.487686144599148e-01, 2.887011017469859e-01, 3.308238711499938e-01, 3.748145444067251e-01, 4.203080130472308e-01, 4.669049179648736e-01, 5.141853413578332e-01, 5.617100406669413e-01, 6.090263461524341e-01, 6.556710162134097e-01, 7.012183842298189e-01, 7.452406787622362e-01, 7.873692060484326e-01, 8.272238334368036e-01, 8.645136750188277e-01, 8.989774146126214e-01, 9.304075179845523e-01, 9.585999373974852e-01, 9.834477193784226e-01, 1.004882833289021e+00, 1.022853807278541e+00, 1.037404947967044e+00, 1.048597914202596e+00, 1.056561843427440e+00, 1.061493706243562e+00, 1.063625783716980e+00, 1.063259727973876e+00, 1.060745048351166e+00, 1.056435897894500e+00, 1.050695001011264e+00, 1.043924345068839e+00, 1.036477246028582e+00, 1.028728673666003e+00, 1.021064859918030e+00, 1.014006582262175e+00, 1.007274550102931e+00, 1.001722497437142e+00, 9.973095916665831e-01, 9.939851582601669e-01, 9.916833348089591e-01, 9.903253250249126e-01, 9.898226125376152e-01, 9.900747339893667e-01, 9.909753143689592e-01, 9.924128512256524e-01, 9.942731493578623e-01, 9.964391574315900e-01, 9.987916157534086e-01, 1.001209846205687e+00, 1.003573567479612e+00, 1.005759836364722e+00, 1.007645153692818e+00, 1.009106872290545e+00, 1.010024764464639e+00, 1.010282031682720e+00, 1.009769188700535e+00, 1.008386412173240e+00, 1.006051238984656e+00, 1.002697666156926e+00, 9.982804644584213e-01, 9.927779867939798e-01, 9.861868921689572e-01, 9.776341643922554e-01, 9.674472695701162e-01, 9.551297254161167e-01, 9.403898774115922e-01, 9.229592799642977e-01, 9.026073499372684e-01, 8.792026885629480e-01, 8.526417497265664e-01, 8.228812716163106e-01, 7.899717151715774e-01, 7.540303276706357e-01, 7.152557417328465e-01, 6.739369112409073e-01, 6.304147162292445e-01, 5.850788579084674e-01, 5.383985182966198e-01, 4.908337531732809e-01, 4.428858232573716e-01, 3.950910240537553e-01, 3.480043431985102e-01, 3.021967102409465e-01, 2.582274305805284e-01, 2.166414164389013e-01, 1.779221215201146e-01, 1.424805471287674e-01, 1.106521943353717e-01, 8.269959669528287e-02, 5.883345162013132e-02, 3.920308484545646e-02, 2.386291074479415e-02, 1.269762234246248e-02, 5.356653610215987e-03, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00];
    module.exports = {
      "W75_60": W75_60
    };
  },
  "lc3/tables/w75_120": function lc3TablesW75_120(module, require) {
    var W75_120 = [2.208248743046650e-03, 3.810144195090351e-03, 5.915524734289813e-03, 8.583614568030036e-03, 1.187597226083452e-02, 1.583353014097089e-02, 2.049186515516006e-02, 2.588835928921542e-02, 3.204158944817544e-02, 3.896167212395468e-02, 4.667421691393490e-02, 5.518493372761350e-02, 6.450383844383757e-02, 7.464110714806732e-02, 8.560001618878993e-02, 9.738467025048170e-02, 1.099936025389733e-01, 1.234192774722812e-01, 1.376554565476283e-01, 1.526904374639564e-01, 1.685133626404965e-01, 1.850931046131430e-01, 2.024104194879864e-01, 2.204503651331880e-01, 2.391679406203077e-01, 2.585261682883327e-01, 2.784985387736362e-01, 2.990384315995911e-01, 3.201048623655521e-01, 3.416586222430363e-01, 3.636600340252121e-01, 3.860626951895035e-01, 4.088152724594432e-01, 4.318710458458660e-01, 4.551769877048139e-01, 4.786765926352632e-01, 5.023248131381035e-01, 5.260609162248473e-01, 5.498312828850233e-01, 5.735768827770059e-01, 5.972413384410342e-01, 6.207702424193973e-01, 6.440996624336124e-01, 6.671763816763950e-01, 6.899588537658654e-01, 7.123799800931302e-01, 7.343963718694788e-01, 7.559666880505324e-01, 7.770369811015168e-01, 7.975581136897942e-01, 8.174908555311138e-01, 8.367969496408532e-01, 8.554473095679163e-01, 8.734007983991156e-01, 8.906357189698083e-01, 9.071287701238782e-01, 9.228487835702877e-01, 9.377633225341820e-01, 9.518602062527468e-01, 9.651306001536289e-01, 9.775565405467248e-01, 9.891262086779957e-01, 9.998469191683163e-01, 1.009700729703874e+00, 1.018682286908352e+00, 1.026814550859190e+00, 1.034089812751720e+00, 1.040511956629397e+00, 1.046108368522362e+00, 1.050885649534276e+00, 1.054862887578656e+00, 1.058072205849552e+00, 1.060534138670111e+00, 1.062276617517642e+00, 1.063338150260194e+00, 1.063755566766962e+00, 1.063566320618061e+00, 1.062821557530121e+00, 1.061559958917576e+00, 1.059817091581481e+00, 1.057658760384513e+00, 1.055120057365395e+00, 1.052239850719546e+00, 1.049087785713381e+00, 1.045698595146235e+00, 1.042108306824389e+00, 1.038380985588667e+00, 1.034552762539362e+00, 1.030671997181282e+00, 1.026791666942681e+00, 1.022955584022344e+00, 1.019207332137853e+00, 1.015872887197225e+00, 1.012210174593533e+00, 1.008845591036958e+00, 1.005778512486221e+00, 1.003002618498964e+00, 1.000514601809148e+00, 9.983092287560527e-01, 9.963786013745719e-01, 9.947181322797367e-01, 9.933162157118496e-01, 9.921669569649387e-01, 9.912586027088507e-01, 9.905811038723256e-01, 9.901231181863754e-01, 9.898737119947000e-01, 9.898187066647253e-01, 9.899468001787191e-01, 9.902431753677082e-01, 9.906955635514434e-01, 9.912885401035934e-01, 9.920094690635668e-01, 9.928426927501408e-01, 9.937750666306635e-01, 9.947903979828719e-01, 9.958755336221258e-01, 9.970143670156726e-01, 9.981928706842119e-01, 9.993945064762333e-01, 1.000605860368296e+00, 1.001810400944408e+00, 1.002994573682287e+00, 1.004141548053574e+00, 1.005236884099094e+00, 1.006263925890636e+00, 1.007208903587772e+00, 1.008054893814649e+00, 1.008788016348394e+00, 1.009391822060050e+00, 1.009852958217732e+00, 1.010155293011166e+00, 1.010286018304889e+00, 1.010229878703309e+00, 1.009975407736885e+00, 1.009508455280294e+00, 1.008818483155921e+00, 1.007894884001199e+00, 1.006728757854175e+00, 1.005309913983530e+00, 1.003634560818982e+00, 1.001693634792953e+00, 9.994856628696702e-01, 9.970063702291652e-01, 9.942546868773952e-01, 9.912319673936767e-01, 9.879371153343368e-01, 9.843751246861034e-01, 9.798909633127684e-01, 9.752698788428587e-01, 9.701804980040253e-01, 9.645800268203278e-01, 9.584255335155275e-01, 9.516840138455831e-01, 9.443202322315050e-01, 9.362906241698766e-01, 9.275805069442316e-01, 9.181534137230351e-01, 9.079765240138057e-01, 8.970500584793123e-01, 8.853513603848177e-01, 8.728579265043998e-01, 8.595798186504622e-01, 8.455026150386550e-01, 8.306199433014801e-01, 8.149466481575340e-01, 7.984893775294407e-01, 7.812624496601451e-01, 7.632917692550881e-01, 7.445908434203883e-01, 7.251992870809165e-01, 7.051536683608545e-01, 6.844905446038185e-01, 6.632452099313783e-01, 6.414771616618185e-01, 6.192353336355413e-01, 5.965591325427860e-01, 5.735199893648143e-01, 5.501738510234542e-01, 5.265685382300127e-01, 5.027811586638018e-01, 4.788608890561979e-01, 4.548778943490807e-01, 4.308981228989757e-01, 4.069939642056274e-01, 3.832340305827807e-01, 3.596800983344559e-01, 3.364081000913040e-01, 3.134964181526467e-01, 2.910105654938709e-01, 2.690195851087463e-01, 2.475843475618672e-01, 2.267884333851992e-01, 2.066777706538489e-01, 1.873103432384193e-01, 1.687396441250691e-01, 1.510123820588979e-01, 1.341718422797088e-01, 1.182546623256353e-01, 1.032907339774596e-01, 8.931173602725516e-02, 7.634297866041775e-02, 6.440772914585903e-02, 5.352437147393933e-02, 4.370844528199230e-02, 3.496670991534089e-02, 2.729846292648297e-02, 2.068958080348781e-02, 1.511251252352759e-02, 1.052287538118900e-02, 6.855473143120779e-03, 4.023511190940974e-03, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00];
    module.exports = {
      "W75_120": W75_120
    };
  },
  "lc3/tables/w75_180": function lc3TablesW75_180(module, require) {
    var W75_180 = [1.970849076512990e-03, 2.950608593187313e-03, 4.124477213467950e-03, 5.526886639437362e-03, 7.175411316438510e-03, 9.087577304291669e-03, 1.128191051703656e-02, 1.376953735371754e-02, 1.656002661605294e-02, 1.966508945492317e-02, 2.309535564877266e-02, 2.686128938982976e-02, 3.096325597431720e-02, 3.540362298325999e-02, 4.019156101100901e-02, 4.533314033337320e-02, 5.082893035710152e-02, 5.668154478534839e-02, 6.289353044640154e-02, 6.946962925951473e-02, 7.641063136809326e-02, 8.371600156519982e-02, 9.138842778133426e-02, 9.942940076792395e-02, 1.078347249723074e-01, 1.166045748296231e-01, 1.257365027864348e-01, 1.352268113395951e-01, 1.450735459839195e-01, 1.552738186648721e-01, 1.658221942341435e-01, 1.767111740534608e-01, 1.879287758848813e-01, 1.994731798188807e-01, 2.113429529554800e-01, 2.235245540318082e-01, 2.360030996517997e-01, 2.487686144599148e-01, 2.618138107489893e-01, 2.751291608544314e-01, 2.887011017469859e-01, 3.025140336309949e-01, 3.165588052366450e-01, 3.308238711499938e-01, 3.452955666730954e-01, 3.599639915662127e-01, 3.748145444067251e-01, 3.898318165532388e-01, 4.050010096015846e-01, 4.203080130472308e-01, 4.357395152859960e-01, 4.512778173547499e-01, 4.669049179648736e-01, 4.826090405673480e-01, 4.983754662664123e-01, 5.141853413578332e-01, 5.300214783136831e-01, 5.458693517886994e-01, 5.617100406669413e-01, 5.775281514417204e-01, 5.933046964262578e-01, 6.090263461524341e-01, 6.246741889386914e-01, 6.402275547146322e-01, 6.556710162134097e-01, 6.709959346439072e-01, 6.861845587972498e-01, 7.012183842298189e-01, 7.160784485622184e-01, 7.307560841550591e-01, 7.452406787622362e-01, 7.595151215738793e-01, 7.735619554086122e-01, 7.873692060484326e-01, 8.009231377307978e-01, 8.142113863131932e-01, 8.272238334368036e-01, 8.399523741938065e-01, 8.523861023610134e-01, 8.645136750188277e-01, 8.763240788355384e-01, 8.878142883924764e-01, 8.989774146126214e-01, 9.098033189281092e-01, 9.202843119253094e-01, 9.304075179845523e-01, 9.401696522166354e-01, 9.495677949302647e-01, 9.585999373974852e-01, 9.672602600117832e-01, 9.755451659417252e-01, 9.834477193784226e-01, 9.909719572606611e-01, 9.981192686440387e-01, 1.004882833289021e+00, 1.011257731140136e+00, 1.017244362189382e+00, 1.022853807278541e+00, 1.028087338709125e+00, 1.032937063258800e+00, 1.037404947967044e+00, 1.041501641198980e+00, 1.045232355730946e+00, 1.048597914202596e+00, 1.051603395002874e+00, 1.054255050268478e+00, 1.056561843427440e+00, 1.058534002822506e+00, 1.060174135407872e+00, 1.061493706243562e+00, 1.062499430330238e+00, 1.063205771472337e+00, 1.063625783716980e+00, 1.063764865344437e+00, 1.063637778334477e+00, 1.063259727973876e+00, 1.062646953245063e+00, 1.061804962699513e+00, 1.060745048351166e+00, 1.059484915739590e+00, 1.058045332777575e+00, 1.056435897894500e+00, 1.054662178717384e+00, 1.052740474459255e+00, 1.050695001011264e+00, 1.048538935354313e+00, 1.046278982648917e+00, 1.043924345068839e+00, 1.041495397384132e+00, 1.039010026880522e+00, 1.036477246028582e+00, 1.033907928361672e+00, 1.031319893754215e+00, 1.028728673666003e+00, 1.026148319362665e+00, 1.023589880840269e+00, 1.021064859918030e+00, 1.018562619376553e+00, 1.016557703375972e+00, 1.014006582262175e+00, 1.011629525863078e+00, 1.009385901800645e+00, 1.007274550102931e+00, 1.005296164582239e+00, 1.003445259887302e+00, 1.001722497437142e+00, 1.000127924463537e+00, 9.986575334669062e-01, 9.973095916665831e-01, 9.960835710929218e-01, 9.949765689814285e-01, 9.939851582601669e-01, 9.931075300522219e-01, 9.923413052310536e-01, 9.916833348089591e-01, 9.911300696314259e-01, 9.906783251641723e-01, 9.903253250249126e-01, 9.900675621816006e-01, 9.899012818722897e-01, 9.898226125376152e-01, 9.898278454016073e-01, 9.899132411259368e-01, 9.900747339893667e-01, 9.903082558387314e-01, 9.906098517881138e-01, 9.909753143689592e-01, 9.914003304461825e-01, 9.918809661701072e-01, 9.924128512256524e-01, 9.929917790758115e-01, 9.936133813858116e-01, 9.942731493578623e-01, 9.949669577858075e-01, 9.956903701113655e-01, 9.964391574315900e-01, 9.972085721948355e-01, 9.979942749676792e-01, 9.987916157534086e-01, 9.995960619759856e-01, 1.000404101255877e+00, 1.001209846205687e+00, 1.002009756050340e+00, 1.002799241686241e+00, 1.003573567479612e+00, 1.004328283187225e+00, 1.005058501867633e+00, 1.005759836364722e+00, 1.006427669689071e+00, 1.007057682723931e+00, 1.007645153692818e+00, 1.008185492117307e+00, 1.008674265369618e+00, 1.009106872290545e+00, 1.009479158919060e+00, 1.009786593319936e+00, 1.010024764464639e+00, 1.010189538289831e+00, 1.010276690684798e+00, 1.010282031682720e+00, 1.010201742651156e+00, 1.010032080837507e+00, 1.009769188700535e+00, 1.009409386073207e+00, 1.008949310126241e+00, 1.008386412173240e+00, 1.007717803066923e+00, 1.006940305796912e+00, 1.006051238984656e+00, 1.005048793283357e+00, 1.003931827630468e+00, 1.002697666156926e+00, 1.001344271172154e+00, 9.998720918990379e-01, 9.982804644584213e-01, 9.965665691741982e-01, 9.947317370056415e-01, 9.927779867939798e-01, 9.907013741881066e-01, 9.885041652445283e-01, 9.861868921689572e-01, 9.837119886839835e-01, 9.805846431095010e-01, 9.776341643922554e-01, 9.744550331507363e-01, 9.710629155613092e-01, 9.674472695701162e-01, 9.635939262874074e-01, 9.594913983473223e-01, 9.551297254161167e-01, 9.505013259120755e-01, 9.455928103144016e-01, 9.403898774115922e-01, 9.348867604141315e-01, 9.290805587106350e-01, 9.229592799642976e-01, 9.165095791928667e-01, 9.097244560733702e-01, 9.026073499372684e-01, 8.951550837577193e-01, 8.873561542082500e-01, 8.792026885629480e-01, 8.706996978416294e-01, 8.618474244579353e-01, 8.526417497265664e-01, 8.430778332415034e-01, 8.331549046805315e-01, 8.228812716163106e-01, 8.122575969197091e-01, 8.012854392434710e-01, 7.899717151715774e-01, 7.783181771724644e-01, 7.663377104116385e-01, 7.540303276706357e-01, 7.414079909457567e-01, 7.284775008035390e-01, 7.152557417328465e-01, 7.017517394571592e-01, 6.879756318118113e-01, 6.739369112409073e-01, 6.596525732013095e-01, 6.451394890668392e-01, 6.304147162292445e-01, 6.154836219271654e-01, 6.003658519413984e-01, 5.850788579084674e-01, 5.696495364564049e-01, 5.540848098312343e-01, 5.383985182966198e-01, 5.226147377537511e-01, 5.067568049662954e-01, 4.908337531732726e-01, 4.748660326525270e-01, 4.588765658108130e-01, 4.428858232573716e-01, 4.269065392300330e-01, 4.109709733914872e-01, 3.950910240537540e-01, 3.792913270170828e-01, 3.635874169858631e-01, 3.480043431985094e-01, 3.325632006175457e-01, 3.172874848823412e-01, 3.021967102409465e-01, 2.873094025754711e-01, 2.726439916003860e-01, 2.582274305805277e-01, 2.440728561740129e-01, 2.302089773823469e-01, 2.166414164389010e-01, 2.033984806897052e-01, 1.904861615463941e-01, 1.779221215201146e-01, 1.657266744835887e-01, 1.539063966799855e-01, 1.424805471287671e-01, 1.314539801011583e-01, 1.208417782380949e-01, 1.106521943353716e-01, 1.008917341936222e-01, 9.157188508647542e-02, 8.269959669528287e-02, 7.428155288862677e-02, 6.632423815331720e-02, 5.883345162013123e-02, 5.181406762377953e-02, 4.526983455651076e-02, 3.920308484545643e-02, 3.361441594214110e-02, 2.850233081562859e-02, 2.386291074479415e-02, 1.968942265531783e-02, 1.597205270240860e-02, 1.269762234246247e-02, 9.849377394464552e-03, 7.407244632998355e-03, 5.356653610215985e-03, 3.832265518746914e-03, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00];
    module.exports = {
      "W75_180": W75_180
    };
  },
  "lc3/tables/w75_240": function lc3TablesW75_240(module, require) {
    var W75_240 = [1.848330370601890e-03, 2.564818394430541e-03, 3.367621175255762e-03, 4.287366172947020e-03, 5.338301429131479e-03, 6.526792229804446e-03, 7.861125872744963e-03, 9.346281793294168e-03, 1.099168677073023e-02, 1.280111724327587e-02, 1.478059105262588e-02, 1.693070430750747e-02, 1.925923070409017e-02, 2.176969372101092e-02, 2.446859826144651e-02, 2.735565427385896e-02, 3.043192302576378e-02, 3.369804639006632e-02, 3.715835772551574e-02, 4.081481795207546e-02, 4.467080684234739e-02, 4.872629952625619e-02, 5.298206325441551e-02, 5.743824696664848e-02, 6.209685798752235e-02, 6.696097666085293e-02, 7.202983636789818e-02, 7.730391464771366e-02, 8.278255740953620e-02, 8.846821015931731e-02, 9.436075664518449e-02, 1.004602720036002e-01, 1.067638237504515e-01, 1.132736794406103e-01, 1.199864202730101e-01, 1.269035206805856e-01, 1.340208531277774e-01, 1.413395568701277e-01, 1.488572112889720e-01, 1.565736853381255e-01, 1.644846220563571e-01, 1.725890765381433e-01, 1.808790898204713e-01, 1.893543196006846e-01, 1.980122435284018e-01, 2.068541409946420e-01, 2.158753187570538e-01, 2.250686723708130e-01, 2.344274072499690e-01, 2.439483137105153e-01, 2.536279928378056e-01, 2.634640609879333e-01, 2.734504944781370e-01, 2.835821889865098e-01, 2.938534694786572e-01, 3.042573734615632e-01, 3.147909140113310e-01, 3.254491234269504e-01, 3.362274096618026e-01, 3.471187602907065e-01, 3.581201769604495e-01, 3.692246633783371e-01, 3.804277928712796e-01, 3.917200227416179e-01, 4.030970221548365e-01, 4.145519552168687e-01, 4.260817186124239e-01, 4.376763184816823e-01, 4.493301956572350e-01, 4.610348550393067e-01, 4.727860432828289e-01, 4.845767771787368e-01, 4.964017067665196e-01, 5.082524575564947e-01, 5.201220784839651e-01, 5.320020770005417e-01, 5.438880897441558e-01, 5.557716011811357e-01, 5.676457387746829e-01, 5.795027863150121e-01, 5.913350345927856e-01, 6.031383674734400e-01, 6.149041716859808e-01, 6.266239411056014e-01, 6.382888344252021e-01, 6.498933747767719e-01, 6.614323601501731e-01, 6.729025139063478e-01, 6.842937498334491e-01, 6.956004595358826e-01, 7.068117836489756e-01, 7.179234245192330e-01, 7.289313857272890e-01, 7.398327727973596e-01, 7.506189823719328e-01, 7.612840534177552e-01, 7.718189187016244e-01, 7.822209919639922e-01, 7.924813304551203e-01, 8.025994477230463e-01, 8.125652295019083e-01, 8.223771289200885e-01, 8.320305183749199e-01, 8.415232076745133e-01, 8.508483129483138e-01, 8.600024117819522e-01, 8.689798808251054e-01, 8.777783467294870e-01, 8.863959039558345e-01, 8.948294207910807e-01, 9.030776256602892e-01, 9.111326521556180e-01, 9.189935853649371e-01, 9.266529369336567e-01, 9.341114204165168e-01, 9.413643442928993e-01, 9.484129673709889e-01, 9.552556295973936e-01, 9.618920131378678e-01, 9.683163629086772e-01, 9.745301563621191e-01, 9.805283381417256e-01, 9.863139277672938e-01, 9.918860486198928e-01, 9.972463447664014e-01, 1.002391896644578e+00, 1.007319464375827e+00, 1.012027073435850e+00, 1.016516541512393e+00, 1.020794302688699e+00, 1.024860815794490e+00, 1.028714705809749e+00, 1.032351702719174e+00, 1.035773750472822e+00, 1.038984315074006e+00, 1.041987855398911e+00, 1.044785643573356e+00, 1.047378184121997e+00, 1.049767431495211e+00, 1.051954045543143e+00, 1.053942898562160e+00, 1.055734631473796e+00, 1.057341767323983e+00, 1.058757264938716e+00, 1.059986744473714e+00, 1.061036716870687e+00, 1.061906510844496e+00, 1.062603694906377e+00, 1.063132893292572e+00, 1.063502373941053e+00, 1.063709808061891e+00, 1.063763223461893e+00, 1.063667646046172e+00, 1.063430118187021e+00, 1.063056564385666e+00, 1.062554210368898e+00, 1.061922346664364e+00, 1.061167017783231e+00, 1.060294689234573e+00, 1.059314689493745e+00, 1.058234647303768e+00, 1.057058907527535e+00, 1.055789482473656e+00, 1.054429786866560e+00, 1.052987925902714e+00, 1.051475051645344e+00, 1.049899300533228e+00, 1.048262129495776e+00, 1.046566906015578e+00, 1.044816992642391e+00, 1.043021249196200e+00, 1.041187680907488e+00, 1.039323391025476e+00, 1.037431684165083e+00, 1.035517573311265e+00, 1.033585105989712e+00, 1.031643708543028e+00, 1.029699545977279e+00, 1.027759438517856e+00, 1.025827187037112e+00, 1.023907910886626e+00, 1.022008050685529e+00, 1.020139101207016e+00, 1.018263100813380e+00, 1.016879010849981e+00, 1.014921948187593e+00, 1.013096623369458e+00, 1.011342052440818e+00, 1.009659122960534e+00, 1.008050363886717e+00, 1.006517540250988e+00, 1.005057992517306e+00, 1.003669560904293e+00, 1.002353273092562e+00, 1.001109808447114e+00, 9.999375230640204e-01, 9.988345237783536e-01, 9.978006059268592e-01, 9.968357558473706e-01, 9.959388811568640e-01, 9.951084589555501e-01, 9.943434110903315e-01, 9.936429211981983e-01, 9.930058324270904e-01, 9.924309837770386e-01, 9.919174926403282e-01, 9.914638980147298e-01, 9.910682139572967e-01, 9.907292184488009e-01, 9.904462245644213e-01, 9.902178185518503e-01, 9.900419630667118e-01, 9.899170852600004e-01, 9.898419746989491e-01, 9.898150482937847e-01, 9.898343291371600e-01, 9.898982107247224e-01, 9.900054030605746e-01, 9.901541892638673e-01, 9.903424269195302e-01, 9.905684589910844e-01, 9.908309527413479e-01, 9.911280379271901e-01, 9.914575656842904e-01, 9.918178809274675e-01, 9.922075589719793e-01, 9.926247572992801e-01, 9.930673584123647e-01, 9.935333982795475e-01, 9.940214100660039e-01, 9.945296851337717e-01, 9.950559636181178e-01, 9.955983505434736e-01, 9.961555801042186e-01, 9.967256267769223e-01, 9.973060922083319e-01, 9.978952138542876e-01, 9.984914406319209e-01, 9.990928899877792e-01, 9.996970625756828e-01, 1.000303029223210e+00, 1.000907933607887e+00, 1.001510838557739e+00, 1.002109225614564e+00, 1.002701184533730e+00, 1.003285129964668e+00, 1.003859256498246e+00, 1.004421109631332e+00, 1.004968601327613e+00, 1.005500403806944e+00, 1.006014548452834e+00, 1.006508690831783e+00, 1.006981038626341e+00, 1.007430041056790e+00, 1.007853640055005e+00, 1.008249618432853e+00, 1.008616036239346e+00, 1.008951378362138e+00, 1.009253896674588e+00, 1.009521341935844e+00, 1.009751751331617e+00, 1.009943714668776e+00, 1.010095497366507e+00, 1.010204876790192e+00, 1.010270073045154e+00, 1.010289752336835e+00, 1.010262269696272e+00, 1.010185615431975e+00, 1.010058196828792e+00, 1.009878817836722e+00, 1.009645930489341e+00, 1.009357533197330e+00, 1.009012281815637e+00, 1.008609594360786e+00, 1.008148366592626e+00, 1.007626743165711e+00, 1.007043430506158e+00, 1.006397749801444e+00, 1.005688767931258e+00, 1.004915585834316e+00, 1.004077678781271e+00, 1.003174288376062e+00, 1.002204242070086e+00, 1.001166836141424e+00, 1.000062480839591e+00, 9.988914218622672e-01, 9.976522518001048e-01, 9.963438555404762e-01, 9.949674620221296e-01, 9.935246630184282e-01, 9.920139269077016e-01, 9.904332831340030e-01, 9.887851470099116e-01, 9.870726808604894e-01, 9.852974426119764e-01, 9.834011611313795e-01, 9.809494177655508e-01, 9.787827290446353e-01, 9.764682383490441e-01, 9.740428502007106e-01, 9.714988482797869e-01, 9.688299679017578e-01, 9.660309739278938e-01, 9.630951038651144e-01, 9.600181976898812e-01, 9.567957384046786e-01, 9.534262666962353e-01, 9.499034823039632e-01, 9.462221151684139e-01, 9.423758195026390e-01, 9.383617015143452e-01, 9.341777978631194e-01, 9.298231239088762e-01, 9.252923195046721e-01, 9.205801200661107e-01, 9.156797929682001e-01, 9.105906042938267e-01, 9.053150301587091e-01, 8.998527561071954e-01, 8.941994971184931e-01, 8.883501524279332e-01, 8.823016313374981e-01, 8.760548741525249e-01, 8.696123849407055e-01, 8.629727993296973e-01, 8.561351975749198e-01, 8.490981786073120e-01, 8.418570243421116e-01, 8.344140550191105e-01, 8.267746168752393e-01, 8.189392440268611e-01, 8.109048914872936e-01, 8.026753184506191e-01, 7.942537505258295e-01, 7.856416615920516e-01, 7.768386086617421e-01, 7.678531932560713e-01, 7.586851806705738e-01, 7.493306577133620e-01, 7.398091711550503e-01, 7.301099443577747e-01, 7.202477806201014e-01, 7.102241609901638e-01, 7.000443258461506e-01, 6.897118895404929e-01, 6.792311541046628e-01, 6.686081789247391e-01, 6.578509967842496e-01, 6.469657182336516e-01, 6.359596166227444e-01, 6.248403358991607e-01, 6.136035026791002e-01, 6.022650906421884e-01, 5.908290833732823e-01, 5.793094079430561e-01, 5.677111240020907e-01, 5.560374156751429e-01, 5.442936643492620e-01, 5.324897680536480e-01, 5.206360841136255e-01, 5.087432727680400e-01, 4.968111660413653e-01, 4.848498807089364e-01, 4.728681073650310e-01, 4.608759183794885e-01, 4.488810806327018e-01, 4.368910387727512e-01, 4.249120223507826e-01, 4.129606031641687e-01, 4.010358962877044e-01, 3.891578667449375e-01, 3.773221988116735e-01, 3.655437668630012e-01, 3.538323564250667e-01, 3.421961154339837e-01, 3.306448201086834e-01, 3.191875589898712e-01, 3.078333093391901e-01, 2.965881816516454e-01, 2.854637165360221e-01, 2.744624088577634e-01, 2.636095844768899e-01, 2.528831011433226e-01, 2.423234889711821e-01, 2.319257462841697e-01, 2.216908373695833e-01, 2.116380576950307e-01, 2.017669202945304e-01, 1.920822358183417e-01, 1.825891600132626e-01, 1.733059967407588e-01, 1.642292000450303e-01, 1.553626542479246e-01, 1.467170785977411e-01, 1.382993914151456e-01, 1.301050780767305e-01, 1.221453099291547e-01, 1.144234581921691e-01, 1.069410759923033e-01, 9.970258934460623e-02, 9.271242833748693e-02, 8.597374270620267e-02, 7.948933111952143e-02, 7.326165794605345e-02, 6.729341023108891e-02, 6.158740810076327e-02, 5.614580025932222e-02, 5.097007470356519e-02, 4.606170471457775e-02, 4.142201169265410e-02, 3.705141887506228e-02, 3.294946662279392e-02, 2.911533269413120e-02, 2.554764013238235e-02, 2.224377112828603e-02, 1.920006589797908e-02, 1.641222045266977e-02, 1.387476111201306e-02, 1.158063529909875e-02, 9.522136642215920e-03, 7.691373795814687e-03, 6.072078331193099e-03, 4.625812168742676e-03, 3.606851641625968e-03, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00];
    module.exports = {
      "W75_240": W75_240
    };
  },
  "lc3/tables/w75_360": function lc3TablesW75_360(module, require) {
    var W75_360 = [1.721526681611966e-03, 2.208248743046650e-03, 2.689017522595345e-03, 3.226133417706577e-03, 3.810144195090351e-03, 4.453719317184182e-03, 5.153692399681317e-03, 5.915524734289813e-03, 6.738691584410875e-03, 7.628618406907552e-03, 8.583614568030036e-03, 9.609384374613759e-03, 1.070607532160120e-02, 1.187597226083452e-02, 1.311901297315944e-02, 1.443901078588673e-02, 1.583353014097089e-02, 1.730630810758647e-02, 1.885847112173313e-02, 2.049186515516006e-02, 2.220614764140174e-02, 2.400571662419946e-02, 2.588835928921542e-02, 2.785523259150068e-02, 2.990591454016386e-02, 3.204158944817544e-02, 3.426100132985917e-02, 3.656809727321165e-02, 3.896167212395468e-02, 4.144358235567028e-02, 4.401407955156517e-02, 4.667421691393490e-02, 4.942146249896087e-02, 5.225884889914327e-02, 5.518493372761350e-02, 5.820051428449914e-02, 6.130598448769178e-02, 6.450383844383757e-02, 6.779139227807153e-02, 7.117078328947134e-02, 7.464110714806732e-02, 7.820280530933912e-02, 8.185495207937329e-02, 8.560001618878993e-02, 8.943576174662307e-02, 9.336425891679158e-02, 9.738467025048170e-02, 1.014967178422148e-01, 1.056987601379146e-01, 1.099936025389733e-01, 1.143782870006880e-01, 1.188535076446910e-01, 1.234192774722812e-01, 1.280759966861818e-01, 1.328205805921621e-01, 1.376554565476283e-01, 1.425786478649834e-01, 1.475905216894996e-01, 1.526904374639564e-01, 1.578788527293271e-01, 1.631525285166384e-01, 1.685133626404965e-01, 1.739579689655531e-01, 1.794847365410843e-01, 1.850931046131430e-01, 1.907848350801405e-01, 1.965564972779563e-01, 2.024104194879864e-01, 2.083454334275949e-01, 2.143598248322309e-01, 2.204503651331880e-01, 2.266172963796335e-01, 2.328562792793315e-01, 2.391679406203077e-01, 2.455506417347264e-01, 2.520039508016560e-01, 2.585261682883327e-01, 2.651184076263592e-01, 2.717759113203786e-01, 2.784985387736362e-01, 2.852846062288917e-01, 2.921324591263930e-01, 2.990384315995911e-01, 3.060042559686472e-01, 3.130265290443111e-01, 3.201048623655521e-01, 3.272373243719107e-01, 3.344232095441687e-01, 3.416586222430363e-01, 3.489449761645191e-01, 3.562792519116003e-01, 3.636600340252121e-01, 3.710851463600319e-01, 3.785543267164805e-01, 3.860626951895035e-01, 3.936105536140438e-01, 4.011952247532815e-01, 4.088152724594432e-01, 4.164684603494585e-01, 4.241554113955093e-01, 4.318710458458660e-01, 4.396147439144481e-01, 4.473840194903529e-01, 4.551769877048139e-01, 4.629901375019677e-01, 4.708246187885389e-01, 4.786765926352632e-01, 4.865454331135768e-01, 4.944287144003222e-01, 5.023248131381035e-01, 5.102294714645887e-01, 5.181429265558146e-01, 5.260609162248473e-01, 5.339828176544869e-01, 5.419068167854945e-01, 5.498312828850233e-01, 5.577512337479950e-01, 5.656676362338563e-01, 5.735768827770059e-01, 5.814766655477682e-01, 5.893646610908023e-01, 5.972413384410342e-01, 6.051020131945327e-01, 6.129461702965266e-01, 6.207702424193973e-01, 6.285720938000074e-01, 6.363485261821292e-01, 6.440996624336124e-01, 6.518209733012164e-01, 6.595138217057872e-01, 6.671763816763950e-01, 6.748067951703918e-01, 6.824007108459023e-01, 6.899588537658654e-01, 6.974757223488888e-01, 7.049501447553026e-01, 7.123799800931302e-01, 7.197654340542331e-01, 7.271038329243241e-01, 7.343963718694788e-01, 7.416385606661200e-01, 7.488296394277816e-01, 7.559666880505324e-01, 7.630492594418218e-01, 7.700722734566787e-01, 7.770369811015168e-01, 7.839411079555614e-01, 7.907812565704104e-01, 7.975581136897942e-01, 8.042713809653173e-01, 8.109149005929875e-01, 8.174908555311138e-01, 8.239970937711972e-01, 8.304327850184938e-01, 8.367969496408532e-01, 8.430892979726279e-01, 8.493058471422328e-01, 8.554473095679163e-01, 8.615110365133289e-01, 8.674962806836773e-01, 8.734007983991156e-01, 8.792275183442975e-01, 8.849724383046952e-01, 8.906357189698083e-01, 8.962171727097513e-01, 9.017164138681113e-01, 9.071287701238782e-01, 9.124565781610174e-01, 9.176972608396821e-01, 9.228487835702877e-01, 9.279099172570797e-01, 9.328825964768623e-01, 9.377633225341820e-01, 9.425533559491475e-01, 9.472524281763984e-01, 9.518602062527468e-01, 9.563760599307146e-01, 9.608006016536426e-01, 9.651306001536289e-01, 9.693666888567923e-01, 9.735088121912839e-01, 9.775565405467248e-01, 9.815072260762016e-01, 9.853645802900605e-01, 9.891262086779957e-01, 9.927942006806012e-01, 9.963675450849775e-01, 9.998469191683163e-01, 1.003228124845146e+00, 1.006513411821911e+00, 1.009700729703874e+00, 1.012790289606342e+00, 1.015782934360887e+00, 1.018682286908352e+00, 1.021486570410198e+00, 1.024197718428813e+00, 1.026814550859190e+00, 1.029335981099974e+00, 1.031760429936344e+00, 1.034089812751720e+00, 1.036323258515780e+00, 1.038463607653629e+00, 1.040511956629397e+00, 1.042468314695544e+00, 1.044333310154580e+00, 1.046108368522362e+00, 1.047790183156567e+00, 1.049383335559126e+00, 1.050885649534276e+00, 1.052299234616223e+00, 1.053625218490635e+00, 1.054862887578656e+00, 1.056015206502275e+00, 1.057087459299065e+00, 1.058072205849552e+00, 1.058975241719203e+00, 1.059794467230661e+00, 1.060534138670111e+00, 1.061194118632638e+00, 1.061773655564821e+00, 1.062276617517642e+00, 1.062703237255151e+00, 1.063055685508735e+00, 1.063338150260194e+00, 1.063547997184066e+00, 1.063686067900426e+00, 1.063755566766962e+00, 1.063757434953141e+00, 1.063693583520601e+00, 1.063566320618061e+00, 1.063377073891492e+00, 1.063127819699189e+00, 1.062821557530121e+00, 1.062457815392427e+00, 1.062036342819983e+00, 1.061559958917576e+00, 1.061029510184661e+00, 1.060447965083549e+00, 1.059817091581481e+00, 1.059141628118411e+00, 1.058421358875364e+00, 1.057658760384513e+00, 1.056853774077034e+00, 1.056007614360998e+00, 1.055120057365395e+00, 1.054195045438248e+00, 1.053233455551333e+00, 1.052239850719546e+00, 1.051216675517538e+00, 1.050166369287038e+00, 1.049087785713381e+00, 1.047983664181190e+00, 1.046853337647985e+00, 1.045698595146235e+00, 1.044520564730305e+00, 1.043323481681635e+00, 1.042108306824389e+00, 1.040879073476582e+00, 1.039636032987793e+00, 1.038380985588667e+00, 1.037114029603682e+00, 1.035838134533162e+00, 1.034552762539362e+00, 1.033262000621490e+00, 1.031967497567261e+00, 1.030671997181282e+00, 1.029375639312502e+00, 1.028082437365047e+00, 1.026791666942681e+00, 1.025506352493464e+00, 1.024226550306258e+00, 1.022955584022344e+00, 1.021692989563247e+00, 1.020444748460154e+00, 1.019207332137853e+00, 1.017999919156420e+00, 1.017160217193961e+00, 1.015872887197225e+00, 1.014617829299498e+00, 1.013397380801344e+00, 1.012210174593533e+00, 1.011056516187721e+00, 1.009934436494794e+00, 1.008845591036958e+00, 1.007789557609578e+00, 1.006767901472734e+00, 1.005778512486221e+00, 1.004821733696763e+00, 1.003895920161236e+00, 1.003002618498964e+00, 1.002140907258662e+00, 1.001312127031557e+00, 1.000514601809148e+00, 9.997489875663875e-01, 9.990134860651736e-01, 9.983092287560527e-01, 9.976349335738018e-01, 9.969918851181095e-01, 9.963786013745719e-01, 9.957959823242557e-01, 9.952422174315529e-01, 9.947181322797367e-01, 9.942221216035205e-01, 9.937553132700969e-01, 9.933162157118496e-01, 9.929058092648040e-01, 9.925224215680564e-01, 9.921669569649387e-01, 9.918377038474807e-01, 9.915355084098528e-01, 9.912586027088507e-01, 9.910078784250421e-01, 9.907817226664765e-01, 9.905811038723256e-01, 9.904043360106435e-01, 9.902522665150607e-01, 9.901231181863754e-01, 9.900177259420802e-01, 9.899343252516752e-01, 9.898737119947000e-01, 9.898341100636087e-01, 9.898163585163330e-01, 9.898187066647253e-01, 9.898419976335596e-01, 9.898844376083749e-01, 9.899468001787191e-01, 9.900272871794666e-01, 9.901266804330273e-01, 9.902431753677082e-01, 9.903775935673591e-01, 9.905281337320039e-01, 9.906955635514434e-01, 9.908780432538649e-01, 9.910763016962206e-01, 9.912885401035934e-01, 9.915156019790364e-01, 9.917556658638569e-01, 9.920094690635668e-01, 9.922751554325331e-01, 9.925534864640656e-01, 9.928426927501408e-01, 9.931435333387140e-01, 9.934540796611835e-01, 9.937750666306635e-01, 9.941046890713076e-01, 9.944437415635388e-01, 9.947903979828719e-01, 9.951453611435701e-01, 9.955067995758305e-01, 9.958755336221258e-01, 9.962496814968456e-01, 9.966299185765186e-01, 9.970143670156726e-01, 9.974037994063020e-01, 9.977964044701016e-01, 9.981928706842119e-01, 9.985912855613679e-01, 9.989924362978263e-01, 9.993945064762333e-01, 9.997982470741876e-01, 1.000201793638269e+00, 1.000605860368296e+00, 1.001008579910682e+00, 1.001410701714506e+00, 1.001810400944408e+00, 1.002208462087081e+00, 1.002602958395831e+00, 1.002994573682287e+00, 1.003381477277237e+00, 1.003764436338408e+00, 1.004141548053574e+00, 1.004513480396200e+00, 1.004878321344784e+00, 1.005236884099094e+00, 1.005587302935534e+00, 1.005930271724399e+00, 1.006263925890636e+00, 1.006589051746658e+00, 1.006903802351948e+00, 1.007208903587772e+00, 1.007502380110983e+00, 1.007784982346051e+00, 1.008054893814649e+00, 1.008312868199207e+00, 1.008556999006399e+00, 1.008788016348394e+00, 1.009004047709048e+00, 1.009205932867561e+00, 1.009391822060050e+00, 1.009562440424896e+00, 1.009715896739930e+00, 1.009852958217732e+00, 1.009971774079105e+00, 1.010073169648632e+00, 1.010155293011166e+00, 1.010218932642345e+00, 1.010262246288524e+00, 1.010286018304889e+00, 1.010288415013601e+00, 1.010270296641665e+00, 1.010229878703309e+00, 1.010168022758243e+00, 1.010082924574326e+00, 1.009975407736885e+00, 1.009843687123529e+00, 1.009688632854747e+00, 1.009508455280294e+00, 1.009304044596942e+00, 1.009073713509976e+00, 1.008818483155921e+00, 1.008536750845889e+00, 1.008229467503460e+00, 1.007894884001199e+00, 1.007533913863759e+00, 1.007144877861525e+00, 1.006728757854175e+00, 1.006283927891016e+00, 1.005811456284196e+00, 1.005309913983530e+00, 1.004780527277797e+00, 1.004221766054862e+00, 1.003634560818982e+00, 1.003017190938855e+00, 1.002370673225852e+00, 1.001693634792953e+00, 1.000987488105603e+00, 1.000251075456674e+00, 9.994856628696702e-01, 9.986895923896904e-01, 9.978636664333774e-01, 9.970063702291652e-01, 9.961191991291183e-01, 9.952014038559622e-01, 9.942546868773952e-01, 9.932775951012806e-01, 9.922706506028359e-01, 9.912319673936767e-01, 9.901632857185525e-01, 9.890643935223216e-01, 9.879371153343368e-01, 9.867797361083076e-01, 9.855927730842358e-01, 9.843751246861034e-01, 9.831292878900623e-01, 9.813484629113276e-01, 9.798909633127684e-01, 9.784004589849064e-01, 9.768604354115724e-01, 9.752698788428587e-01, 9.736273532416118e-01, 9.719313409832228e-01, 9.701804980040253e-01, 9.683726519652567e-01, 9.665069522597068e-01, 9.645800268203277e-01, 9.625923175883123e-01, 9.605409863432730e-01, 9.584255335155275e-01, 9.562443932750193e-01, 9.539984159028931e-01, 9.516840138455831e-01, 9.493011853637791e-01, 9.468468843298323e-01, 9.443202322315050e-01, 9.417184043233268e-01, 9.390425796467096e-01, 9.362906241698766e-01, 9.334640497363101e-01, 9.305608538768808e-01, 9.275805069442316e-01, 9.245195917195164e-01, 9.213784714413848e-01, 9.181534137230349e-01, 9.148446956130220e-01, 9.114516516017124e-01, 9.079765240138057e-01, 9.044175450831859e-01, 9.007763077278617e-01, 8.970500584793123e-01, 8.932383978549314e-01, 8.893386805647778e-01, 8.853513603848177e-01, 8.812740229566767e-01, 8.771096379139661e-01, 8.728579265043998e-01, 8.685195050926551e-01, 8.640927964490425e-01, 8.595798186504622e-01, 8.549760065595760e-01, 8.502852201263446e-01, 8.455026150386550e-01, 8.406304703204051e-01, 8.356679254927833e-01, 8.306199433014801e-01, 8.254820069905587e-01, 8.202589087059164e-01, 8.149466481575340e-01, 8.095466959213909e-01, 8.040599778581757e-01, 7.984893775294406e-01, 7.928314173180783e-01, 7.870906681120101e-01, 7.812624496601451e-01, 7.753539468965313e-01, 7.693636129738075e-01, 7.632917692550881e-01, 7.571390164385375e-01, 7.509017111797436e-01, 7.445908434203883e-01, 7.382051359832217e-01, 7.317380750199757e-01, 7.251992870809165e-01, 7.185882252895927e-01, 7.119056866892599e-01, 7.051536683608545e-01, 6.983326341551366e-01, 6.914441012238667e-01, 6.844905446038185e-01, 6.774701192768717e-01, 6.703883753752553e-01, 6.632452099313783e-01, 6.560457800753937e-01, 6.487886269109083e-01, 6.414771616618185e-01, 6.341143226974428e-01, 6.267020002885999e-01, 6.192353336355413e-01, 6.117205957668128e-01, 6.041616120083719e-01, 5.965591325427860e-01, 5.889144007425270e-01, 5.812347834141942e-01, 5.735199893648143e-01, 5.657706158383411e-01, 5.579880671567978e-01, 5.501738510234542e-01, 5.423301939386325e-01, 5.344607980557825e-01, 5.265685382300127e-01, 5.186563241060174e-01, 5.107288126105302e-01, 5.027811586638018e-01, 4.948194909906872e-01, 4.868451392486417e-01, 4.788608890561871e-01, 4.708699282370115e-01, 4.628751440565413e-01, 4.548778943490807e-01, 4.468825120278060e-01, 4.388893249911809e-01, 4.308981228989757e-01, 4.229183223777856e-01, 4.149508779761170e-01, 4.069939642056243e-01, 3.990526483957498e-01, 3.911346135115557e-01, 3.832340305827807e-01, 3.753546526584436e-01, 3.675020596488621e-01, 3.596800983344559e-01, 3.518873119772211e-01, 3.441301658282572e-01, 3.364081000913025e-01, 3.287289661673846e-01, 3.210905051632958e-01, 3.134964181526467e-01, 3.059515649397201e-01, 2.984543187240678e-01, 2.910105654938703e-01, 2.836211093775042e-01, 2.762854150573731e-01, 2.690195851087454e-01, 2.618124452057962e-01, 2.546592323719683e-01, 2.475843475618672e-01, 2.405786941912602e-01, 2.336470086662776e-01, 2.267884333851989e-01, 2.200019917678347e-01, 2.133013251703927e-01, 2.066777706538484e-01, 2.001404091043453e-01, 1.936836302775967e-01, 1.873103432384193e-01, 1.810273838836248e-01, 1.748394760623094e-01, 1.687396441250690e-01, 1.627372734819174e-01, 1.568252770506826e-01, 1.510123820588976e-01, 1.452982295367473e-01, 1.396874693829809e-01, 1.341718422797088e-01, 1.287625441360194e-01, 1.234555620731477e-01, 1.182546623256352e-01, 1.131596767663045e-01, 1.081714392735899e-01, 1.032907339774594e-01, 9.852029779063426e-02, 9.386000226048140e-02, 8.931173602725516e-02, 8.487521028829931e-02, 8.055237373221881e-02, 7.634297866041770e-02, 7.224892456088809e-02, 6.826991195487858e-02, 6.440772914585895e-02, 6.066200028414472e-02, 5.703437111472432e-02, 5.352437147393933e-02, 5.013346896851077e-02, 4.686107896077298e-02, 4.370844528199226e-02, 4.067483652594974e-02, 3.776122690656316e-02, 3.496670991534084e-02, 3.229192748331241e-02, 2.973576687031024e-02, 2.729846292648297e-02, 2.497871856111264e-02, 2.277625418320712e-02, 2.068958080348780e-02, 1.871781693470649e-02, 1.685934175287805e-02, 1.511251252352758e-02, 1.347570944951177e-02, 1.194627091218482e-02, 1.052287538118900e-02, 9.201309412840026e-03, 7.981243163732707e-03, 6.855473143120775e-03, 5.826573343851640e-03, 4.878385254226555e-03, 4.023511190940970e-03, 3.154186627586960e-03, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00, 0.000000000000000e+00];
    module.exports = {
      "W75_360": W75_360
    };
  },
  "lc3/tables/z": function lc3TablesZ(module, require) {
    var Z_TBL = [[30, 60, 90, 120, 180, 180], [14, 28, 42, 56, 84, 84]];
    module.exports = {
      "Z_TBL": Z_TBL
    };
  },
  "lc3/error": function lc3Error(module, require) {
    var Lc3ObjUtil = require("./common/object_util");

    var Inherits = Lc3ObjUtil.Inherits;

    function LC3Error() {
      var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      Error.call(this, message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.message = message;
    }

    function LC3BugError() {
      var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      LC3Error.call(this, message);
    }

    function LC3IllegalParameterError() {
      var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      LC3Error.call(this, message);
    }

    function LC3IllegalIndexError() {
      var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      LC3Error.call(this, message);
    }

    function LC3IllegalOperationError() {
      var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
      LC3Error.call(this, message);
    }

    Inherits(LC3Error, Error);
    Inherits(LC3BugError, LC3Error);
    Inherits(LC3IllegalParameterError, LC3Error);
    Inherits(LC3IllegalIndexError, LC3Error);
    Inherits(LC3IllegalOperationError, LC3Error);
    module.exports = {
      "LC3Error": LC3Error,
      "LC3BugError": LC3BugError,
      "LC3IllegalParameterError": LC3IllegalParameterError,
      "LC3IllegalIndexError": LC3IllegalIndexError,
      "LC3IllegalOperationError": LC3IllegalOperationError
    };
  },
  "browser/src/api": function browserSrcApi(module, require) {
    var Lc3Fs = require("./../../lc3/common/fs");

    var Lc3Nms = require("./../../lc3/common/nms");

    var Lc3EcEncoder = require("./../../lc3/encoder/encoder");

    var Lc3DcDecoder = require("./../../lc3/decoder/decoder");

    var Lc3DcBec = require("./../../lc3/decoder/bec");

    var Lc3MathFftTfmCore = require("./../../lc3/math/fft-tfm-core");

    var Lc3MathFft = require("./../../lc3/math/fft");

    var Lc3Error = require("./../../lc3/error");

    var LC3SampleRate = Lc3Fs.LC3SampleRate;
    var LC3FrameDuration = Lc3Nms.LC3FrameDuration;
    var LC3Encoder = Lc3EcEncoder.LC3Encoder;
    var LC3Decoder = Lc3DcDecoder.LC3Decoder;
    var LC3BEC = Lc3DcBec.LC3BEC;
    var LC3Error = Lc3Error.LC3Error;
    var LC3IllegalParameterError = Lc3Error.LC3IllegalParameterError;
    var LC3IllegalIndexError = Lc3Error.LC3IllegalIndexError;
    var LC3IllegalOperationError = Lc3Error.LC3IllegalOperationError;
    var IFFTTransformer = Lc3MathFftTfmCore.IFFTTransformer;
    var IFFTTransformerFactory = Lc3MathFftTfmCore.IFFTTransformerFactory;
    var SetCustomTransformer = Lc3MathFft.SetCustomTransformer;
    var UnsetCustomTransformer = Lc3MathFft.UnsetCustomTransformer;
    module.exports = {
      "Core": {
        "LC3SampleRate": LC3SampleRate,
        "LC3FrameDuration": LC3FrameDuration
      },
      "Encoder": {
        "LC3Encoder": LC3Encoder
      },
      "Decoder": {
        "LC3Decoder": LC3Decoder,
        "LC3BEC": LC3BEC
      },
      "Error": {
        "LC3Error": LC3Error,
        "LC3IllegalParameterError": LC3IllegalParameterError,
        "LC3IllegalIndexError": LC3IllegalIndexError,
        "LC3IllegalOperationError": LC3IllegalOperationError
      },
      "Extension": {
        "FFT": {
          "Classes": {
            "IFFTTransformer": IFFTTransformer,
            "IFFTTransformerFactory": IFFTTransformerFactory
          },
          "SetCustomTransformer": SetCustomTransformer,
          "UnsetCustomTransformer": UnsetCustomTransformer
        }
      }
    };
  }
});
