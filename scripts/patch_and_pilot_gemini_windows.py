"""
Installer, ASAR Packer & Live Pilot for Google Gemini Windows App
(`C:\\Users\\aphro\\AppData\\Local\\Google\\Gemini\\app-1.17.0\\Gemini.exe`).

Capabilities:
1. Extracts & backs up `resources/app.asar` -> `resources/app.asar.bak`
2. Links & injects the full Real Voice-to-Voice Extension (`voice_bridge_native.js`,
   `gemini_voice_content.js`, upgraded `preload.js`, `top_bar.html`, `stc_pill.html`)
3. Repacks `resources/app.asar` with valid Chromium Pickle alignment, SHA256 integrity
   blocks, & preserves `app.asar.unpacked` references (`src/gemini_native.node`, `assets/spark.svg`, etc.)
4. Pilots `Gemini.exe` via:
   - CLI flags (`--start-dictation`, `--hide`)
   - Named Pipe `\\\\.\\pipe\\Google.Gemini.AppLauncher` (`SHOW`, `HIDE`, `STC_TRIGGER`, `RELOAD`, `OPEN_SETTINGS`)
   - Gemini Live Voice Hub HTTP/WebSocket bridge (`http://127.0.0.1:8765/api/voice`)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import struct
import subprocess
import time
import urllib.request
from pathlib import Path
from typing import Any

GEMINI_ROOT = Path(r"C:\Users\aphro\AppData\Local\Google\Gemini")
GEMINI_APP_DIR = GEMINI_ROOT / "app-1.17.0"
GEMINI_EXE = GEMINI_APP_DIR / "Gemini.exe"
GEMINI_LAUNCHER_EXE = GEMINI_APP_DIR / "GeminiAppLauncher.exe"
ASAR_PATH = GEMINI_APP_DIR / "resources" / "app.asar"
ASAR_BAK_PATH = GEMINI_APP_DIR / "resources" / "app.asar.bak"
ROAMING_SETTINGS = Path(r"C:\Users\aphro\AppData\Roaming\gemini\settings.json")

WORKSPACE_ROOT = Path(r"C:\Users\aphro\google")
EXTRACTED_DIR = WORKSPACE_ROOT / "apps" / "gemini_windows_patcher" / "asar_extracted"
EXT_CONTENT_JS = WORKSPACE_ROOT / "apps" / "gemini_voice_extension" / "content.js"
BRIDGE_HTTP = "http://127.0.0.1:8765"
SUPER_APP_HTTP = "http://127.0.0.1:8787"
TAURI_V3_HTTP = "http://127.0.0.1:8788"


def read_asar_header(asar_file: Path) -> tuple[dict[str, Any], int, bytes]:
    data = asar_file.read_bytes()
    pickle_payload_size = struct.unpack("<I", data[4:8])[0]
    header_str_size = struct.unpack("<I", data[12:16])[0]
    header_json = data[16 : 16 + header_str_size].decode("utf-8").rstrip("\x00")
    header = json.loads(header_json)
    base_offset = 8 + pickle_payload_size
    return header, base_offset, data


def patch_main_js() -> None:
    """Applies surgical Voice-to-Voice & Piloting hooks to `src/main.js`."""
    orig_header, base_offset, bak_data = read_asar_header(ASAR_BAK_PATH)
    main_meta = orig_header["files"]["src"]["files"]["main.js"]
    orig_main_bytes = bak_data[
        base_offset + int(main_meta["offset"]) : base_offset
        + int(main_meta["offset"])
        + int(main_meta["size"])
    ]
    code = orig_main_bytes.decode("utf-8")

    # 1. Enlarge floating STC voice capsule window slightly to fit Gemini SVG + live subtitle
    code = code.replace("vg=244,Cg=116", "vg=260,Cg=124", 1)

    # 2. Always enable Speak-to-Window (`Jt()`)
    old_jt = 'function Jt(){return process.env.GEMINI_ENABLE_SPEAK_TO_WINDOW==="true"}'
    new_jt = "function Jt(){return!0}"
    assert old_jt in code, "Could not find Jt() in src/main.js"
    code = code.replace(old_jt, new_jt, 1)

    # 3. Replace dummy `Hs` class with `RealGeminiVoiceSession` from `./voice_bridge_native.js`
    old_hs = (
        'uu="Hello to Speak to Window",Ag=8e3,Hs=class{latestTranscript="";listeners=new Map;'
        "async startSession(t,n){this.latestTranscript=uu,t({transcript:uu,isFinal:!0})}"
        'sendAudioData(t){}sendSpeechContext(t){}finishAudioStream(){this.emit("finalResult",this.latestTranscript)}'
        "stopRecognition(){}cancelRecognition(){}getLatestTranscript(){return this.latestTranscript}"
        "on(t,n){let o=this.listeners.get(t)||[];o.push(n),this.listeners.set(t,o)}"
        "once(t,n){let o=(...r)=>{this.off(t,o),n(...r)};o.originalListener=n,this.on(t,o)}"
        "off(t,n){let o=this.listeners.get(t);if(!o)return;let r=o.findIndex(i=>i===n||i.originalListener===n);r!==-1&&o.splice(r,1)}"
        "emit(t,...n){let o=this.listeners.get(t);if(o)for(let r of[...o])r(...n)}}"
    )
    new_hs = 'uu="",Ag=12e3,Hs=require("./voice_bridge_native.js").RealGeminiVoiceSession'
    assert old_hs in code, "Could not find dummy Hs class in src/main.js"
    code = code.replace(old_hs, new_hs, 1)

    # 4. In `Vs(e)` (completeAndSubmitSession), trigger `j.finishAudioStream()` before awaiting `i`
    old_vs = 'j?.once("finalResult",d),j?.once("streamEnd",g),j?.once("executeChatQuery",m)});'
    new_vs = 'j?.once("finalResult",d),j?.once("streamEnd",g),j?.once("executeChatQuery",m),j?.finishAudioStream?.()});'
    assert old_vs in code, "Could not find Vs() listener registration in src/main.js"
    code = code.replace(old_vs, new_vs, 1)

    # 5. Attach Top Bar WebContentsView to voice_bridge_native
    old_tb = 'r.webContents.loadURL(z("top_bar","top_bar.html"));'
    new_tb = 'r.webContents.loadURL(z("top_bar","top_bar.html"));try{require("./voice_bridge_native.js").attachToTopBarWebContents(r.webContents)}catch{}'
    assert old_tb in code, "Could not find top_bar loadURL in src/main.js"
    code = code.replace(old_tb, new_tb, 1)

    # 6. Attach Main Gemini WebContentsView (`a = l.webContents`) to voice_bridge_native
    old_main_wc = "o.contentView.addChildView(l),V=l;let a=l.webContents;"
    new_main_wc = 'o.contentView.addChildView(l),V=l;let a=l.webContents;try{require("./voice_bridge_native.js").attachToMainWebContents(a)}catch{}'
    assert old_main_wc in code, "Could not find main WebContentsView creation in src/main.js"
    code = code.replace(old_main_wc, new_main_wc, 1)

    # 7. Initialize `initVoiceBridgeNative` when app is ready
    old_ready = 'B("speakToWindowEnabled",Jt()),Jt())'
    new_ready = (
        'B("speakToWindowEnabled",Jt()),'
        'require("./voice_bridge_native.js").initVoiceBridgeNative({'
        "getMainWebContents:Ot,getMainWindow:Ze,getStcWindow:Qt,triggerStc:kr,"
        "showMainWindow:ct,hideMainWindow:mi,reloadMainWindow:Uo,getNativeAddon:Ae"
        "}),Jt())"
    )
    assert old_ready in code, "Could not find speakToWindowEnabled init in src/main.js"
    code = code.replace(old_ready, new_ready, 1)

    target_main = EXTRACTED_DIR / "src" / "main.js"
    target_main.write_bytes(code.encode("utf-8"))
    print("[OK] Patched src/main.js with RealGeminiVoiceSession & native hooks.")


def pack_asar(extracted_root: Path, orig_asar_bak: Path, output_asar: Path) -> None:
    """
    Packs `extracted_root` into `output_asar` while preserving all `unpacked: True`
    entries from `orig_asar_bak` and computing valid SHA256 integrity blocks.
    """
    orig_header, _, _ = read_asar_header(orig_asar_bak)
    payload_chunks: list[bytes] = []
    current_offset = 0

    def build_tree(disk_dir: Path, orig_node: dict[str, Any] | None) -> dict[str, Any]:
        nonlocal current_offset
        files_dict: dict[str, Any] = {}
        orig_files = (orig_node or {}).get("files", {})

        disk_map: dict[str, Path] = {}
        if disk_dir.exists():
            for item in disk_dir.iterdir():
                disk_map[item.name] = item

        all_names = sorted(set(orig_files.keys()) | set(disk_map.keys()))
        for name in all_names:
            o_child = orig_files.get(name)
            disk_item = disk_map.get(name)

            if o_child and "files" in o_child:
                if disk_item and disk_item.is_dir():
                    files_dict[name] = build_tree(disk_item, o_child)
                else:
                    files_dict[name] = o_child
            elif o_child and o_child.get("unpacked"):
                files_dict[name] = o_child
            elif disk_item is not None:
                if disk_item.is_dir():
                    files_dict[name] = build_tree(disk_item, o_child)
                else:
                    raw = disk_item.read_bytes()
                    size = len(raw)
                    sha256_hex = hashlib.sha256(raw).hexdigest()
                    block_size = 4194304
                    blocks = [
                        hashlib.sha256(raw[i : i + block_size]).hexdigest()
                        for i in range(0, max(1, size), block_size)
                    ]
                    entry: dict[str, Any] = {
                        "size": size,
                        "offset": str(current_offset),
                        "integrity": {
                            "algorithm": "SHA256",
                            "hash": sha256_hex,
                            "blockSize": block_size,
                            "blocks": blocks,
                        },
                    }
                    if o_child and o_child.get("executable") or disk_item.suffix == ".js":
                        entry["executable"] = True
                    payload_chunks.append(raw)
                    current_offset += size
                    files_dict[name] = entry

        return {"files": files_dict}

    new_header = build_tree(extracted_root, orig_header)
    header_bytes = json.dumps(new_header, separators=(",", ":")).encode("utf-8")
    header_str_len = len(header_bytes)
    pad_len = (4 - (header_str_len % 4)) % 4
    aligned_str_len = header_str_len + pad_len
    inner_pickle_size = 4 + aligned_str_len
    outer_pickle_payload_size = 8 + aligned_str_len

    header_pickle = (
        struct.pack(
            "<IIII",
            4,
            outer_pickle_payload_size,
            inner_pickle_size,
            header_str_len,
        )
        + header_bytes
        + (b"\x00" * pad_len)
    )

    output_asar.write_bytes(header_pickle + b"".join(payload_chunks))
    print(f"[OK] Packed {output_asar} ({output_asar.stat().st_size:,} bytes)")


def stop_gemini_windows_processes() -> None:
    subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "Get-Process Gemini, GeminiAppLauncher -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue",
        ],
        capture_output=True,
    )
    time.sleep(0.6)


def install_voice_extension() -> dict[str, Any]:
    if not ASAR_BAK_PATH.exists():
        shutil.copy2(ASAR_PATH, ASAR_BAK_PATH)

    shutil.copy2(EXT_CONTENT_JS, EXTRACTED_DIR / "src" / "gemini_voice_content.js")
    patch_main_js()

    ROAMING_SETTINGS.parent.mkdir(parents=True, exist_ok=True)
    settings_data: dict[str, Any] = {}
    if ROAMING_SETTINGS.exists():
        try:
            settings_data = json.loads(ROAMING_SETTINGS.read_text(encoding="utf-8"))
        except Exception:
            settings_data = {}
    settings_data["speakToWindowEnabled"] = True
    settings_data.setdefault("stcShortcut", "Alt+Shift+D")
    settings_data.setdefault("shortcut", "Alt+Space")
    ROAMING_SETTINGS.write_text(json.dumps(settings_data, indent=2), encoding="utf-8")

    stop_gemini_windows_processes()
    pack_asar(EXTRACTED_DIR, ASAR_BAK_PATH, ASAR_PATH)

    return {
        "status": "installed",
        "asar_path": str(ASAR_PATH),
        "asar_size": ASAR_PATH.stat().st_size,
        "roaming_settings": str(ROAMING_SETTINGS),
        "speakToWindowEnabled": True,
    }


def launch_gemini_windows(start_dictation: bool = False) -> dict[str, Any]:
    env = dict(os.environ)
    env["GEMINI_ENABLE_SPEAK_TO_WINDOW"] = "true"
    env["ANTIGRAVITY_MIC"] = "127.0.0.1:24713"

    if GEMINI_LAUNCHER_EXE.exists():
        subprocess.Popen(
            [str(GEMINI_LAUNCHER_EXE)],
            cwd=str(GEMINI_APP_DIR),
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(0.4)

    args = [str(GEMINI_EXE)]
    if start_dictation:
        args.append("--start-dictation")

    proc = subprocess.Popen(
        args,
        cwd=str(GEMINI_APP_DIR),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return {
        "status": "launched",
        "pid": proc.pid,
        "exe": str(GEMINI_EXE),
        "start_dictation": start_dictation,
    }


def send_hub_pilot(command: str, prompt: str = "", text: str = "") -> dict[str, Any]:
    payload = json.dumps(
        {
            "action": "pilot_gemini_windows",
            "command": command,
            "prompt": prompt,
            "text": text,
            "surface": "gemini_windows_pilot_cli",
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"{BRIDGE_HTTP}/api/voice",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=8.0) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Install, Link & Pilot Real Voice-to-Voice Extension in Google Gemini Windows App"
    )
    parser.add_argument(
        "--install",
        action="store_true",
        help="Patch & repack app.asar with full Real Voice-to-Voice extension",
    )
    parser.add_argument(
        "--launch",
        action="store_true",
        help="Launch Gemini.exe & GeminiAppLauncher.exe",
    )
    parser.add_argument(
        "--start-dictation",
        action="store_true",
        help="Trigger the floating Speak-to-Window / Voice-to-Voice capsule (stc-pill)",
    )
    parser.add_argument(
        "--pilot",
        choices=["show", "hide", "stc_trigger", "reload", "toggle_live"],
        help="Send a live pilot command to Gemini.exe",
    )
    parser.add_argument(
        "--send-prompt",
        type=str,
        help="Inject and submit a prompt inside Gemini.exe",
    )
    args = parser.parse_args()

    out: dict[str, Any] = {}
    if args.install:
        out["install"] = install_voice_extension()
    if args.launch:
        out["launch"] = launch_gemini_windows(start_dictation=args.start_dictation)
    elif args.start_dictation:
        out["dictation"] = launch_gemini_windows(start_dictation=True)
    if args.pilot:
        out["pilot"] = send_hub_pilot(args.pilot)
    if args.send_prompt:
        out["send_prompt"] = send_hub_pilot("send_prompt", prompt=args.send_prompt)

    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
