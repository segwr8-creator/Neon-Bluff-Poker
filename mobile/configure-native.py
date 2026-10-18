from pathlib import Path
import os, plistlib, re, sys
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parent
platform = sys.argv[1]
build_number = int(os.environ.get('GITHUB_RUN_NUMBER', '1'))
if platform == 'android':
    ns = 'http://schemas.android.com/apk/res/android'
    ET.register_namespace('android', ns)
    manifest = root / 'android/app/src/main/AndroidManifest.xml'
    tree = ET.parse(manifest)
    app = tree.getroot().find('application')
    if app is None: raise RuntimeError('Missing Android application')
    app.set(f'{{{ns}}}usesCleartextTraffic', 'false')
    # Guest bearer identities must not be copied through Android device backup.
    app.set(f'{{{ns}}}allowBackup', 'false')
    found = False
    for activity in app.findall('activity'):
        if activity.get(f'{{{ns}}}name', '').endswith('MainActivity'):
            activity.set(f'{{{ns}}}screenOrientation', 'sensorLandscape')
            found = True
    if not found: raise RuntimeError('Missing MainActivity')
    tree.write(manifest, encoding='utf-8', xml_declaration=True)
    gradle = root / 'android/app/build.gradle'
    text, count = re.subn(r'\bversionCode\s*(?:=\s*)?\d+', f'versionCode {build_number}', gradle.read_text(), count=1)
    if count != 1: raise RuntimeError('Missing Android versionCode')
    gradle.write_text(text)
elif platform == 'ios':
    file = root / 'ios/App/App/Info.plist'
    with file.open('rb') as f: data = plistlib.load(f)
    orientations = ['UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight']
    data['UISupportedInterfaceOrientations'] = orientations
    data['UISupportedInterfaceOrientations~ipad'] = orientations
    data['UIRequiresFullScreen'] = True
    data['CFBundleVersion'] = str(build_number)
    with file.open('wb') as f: plistlib.dump(data, f)
else:
    raise RuntimeError('Expected android or ios')
