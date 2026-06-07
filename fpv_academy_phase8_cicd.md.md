# Role and Objective
You are implementing Phase 8 of "FPV Academy" (Gemini 3.5 Flash High). 
The user wants to automate the Android build process (APK and AAB) via GitHub Actions. 
Your CURRENT objective is to ensure Capacitor is properly configured for the Vite project and to create the GitHub Actions workflow file.

# Execution Requirement (CRITICAL)
Do not break any existing 3D physics or UI code. Just add the necessary tooling and CI/CD configuration.

# Task 1: Capacitor Setup & Configuration
Since this is a Vite project (which outputs to the `dist` folder), we need to ensure Capacitor is correctly configured to wrap the web app into an Android project.
1. Install Capacitor dependencies if they are not already in `package.json`: 
   `npm install @capacitor/core @capacitor/android`
   `npm install -D @capacitor/cli`
2. Initialize Capacitor if `capacitor.config.ts` (or `.json`) does not exist:
   `npx cap init "FPV Academy" "com.fpvacademy.app" --web-dir dist`
   *(Ensure the `webDir` is strictly set to `"dist"`, as this is Vite's default build directory).*
3. Add the Android platform if the `android` folder does not exist:
   `npx cap add android`

# Task 2: GitHub Actions Workflow Creation
Create the CI/CD pipeline file that GitHub will run automatically on push.
1. Create the directory structure: `.github/workflows/`
2. Create a file named `android-build.yml` inside it with the following exact content:

\`\`\`yaml
name: Android CI/CD Build

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Web Dependencies
        run: npm ci || npm install

      - name: Build Vite Web App
        run: npm run build

      - name: Setup Java JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Sync Capacitor with Android
        run: npx cap sync android

      - name: Grant Execute Permission for Gradlew
        run: cd android && chmod +x gradlew

      - name: Build Debug APK
        run: cd android && ./gradlew assembleDebug

      - name: Build Release AAB (Unsigned)
        run: cd android && ./gradlew bundleRelease

      - name: Upload Debug APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: FPV_Academy_Debug_APK
          path: android/app/build/outputs/apk/debug/app-debug.apk

      - name: Upload Release AAB Artifact
        uses: actions/upload-artifact@v4
        with:
          name: FPV_Academy_Release_AAB_Unsigned
          path: android/app/build/outputs/bundle/release/app-release.aab
\`\`\`

# Expected Output
The project should now have a fully configured `.github/workflows/android-build.yml` file and the `android` folder ready. When the user commits and pushes to the `main` branch, GitHub Actions will automatically install Node, build the 3D web app, install Java, sync the assets to Android, compile the app, and attach the `.apk` and `.aab` files to the Actions run for download.