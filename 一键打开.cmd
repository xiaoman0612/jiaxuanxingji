@echo off
chcp 65001 >nul
setlocal

rem ============================================================
rem  稼轩行迹 · 一键打开（课堂演示用）
rem  双击本文件：用 Chrome / Edge 的「应用窗口 + 全屏」打开地图，
rem  没有地址栏、标签页，像放一段课件一样干净。
rem  加参数 -echo 只打印将要打开的地址，不启动浏览器。
rem ============================================================

set "HERE=%~dp0"
set "PAGE=%HERE%index.html"

rem 如果本文件被单独放到桌面，就回到项目目录找 index.html
if not exist "%PAGE%" if exist "D:\ds workpart\稼轩行迹\index.html" set "PAGE=D:\ds workpart\稼轩行迹\index.html"

if not exist "%PAGE%" (
  echo [错误] 没有找到 index.html。
  echo        请把本文件和 index.html 放在同一个文件夹里。
  echo        当前目录：%HERE%
  pause
  exit /b 1
)

rem 把中文 / 空格路径转成百分号编码的 file:// 地址，Chrome 才能正确打开
set "URL="
for /f "usebackq delims=" %%u in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$u=[uri]'%PAGE%';$u.AbsoluteUri"`) do set "URL=%%u"
if not defined URL set "URL=file:///%PAGE:\=/%"

if /i "%~1"=="-echo" (
  echo %URL%
  exit /b 0
)

set "BROWSER="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if defined BROWSER (
  start "" "%BROWSER%" --no-first-run --no-default-browser-check --app="%URL%" --start-fullscreen
) else (
  rem 没有 Chrome / Edge 时，交给系统默认浏览器
  start "" "%PAGE%"
)

exit /b 0
