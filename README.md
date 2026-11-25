# Shade Match – Fabric Batch Colour Comparison System

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2EA44F?logo=github&logoColor=white)](https://aruni302.github.io/ShadeMatch-App-MAPT22B136/#dashboard)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5 / CSS3](https://img.shields.io/badge/HTML5%20%2F%20CSS3-Responsive-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Storage: IndexedDB](https://img.shields.io/badge/Storage-IndexedDB%20%2B%20LocalStorage-2F3E9E)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![Offline Capable](https://img.shields.io/badge/Offline-100%25%20Client--Side-success)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

**Shade Match** is a modern, standalone web application engineered for garment factory Quality Control (QC) teams to detect and analyze color variations across fabric rolls and dye lots before cutting and sewing.

> 🌐 **Live Website**: [https://aruni302.github.io/ShadeMatch-App-MAPT22B136/#dashboard](https://aruni302.github.io/ShadeMatch-App-MAPT22B136/#dashboard)

Built entirely with standard Web APIs (pure HTML5, CSS3, and vanilla JavaScript), Shade Match requires **zero dependencies, no backend server, and no build tools**. It runs directly in any modern desktop, tablet, or mobile browser.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Colour Science Pipeline](#colour-science-pipeline)
  - [Color Space Transformations](#color-space-transformations)
  - [CIEDE2000 Tolerance Standards](#ciede2000-tolerance-standards)
  - [Trimmed-Mean Pixel Sampling](#trimmed-mean-pixel-sampling)
- [Application Architecture](#application-architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [User Guide](#user-guide)
  - [1. Registering Batches](#1-registering-batches)
  - [2. Fabric Image Sampling](#2-fabric-image-sampling)
  - [3. Running Comparisons](#3-running-comparisons)
  - [4. Comparison Reports & History](#4-comparison-reports--history)
  - [5. Backup & Data Management](#5-backup--data-management)
- [Fabric Photography Guidelines](#fabric-photography-guidelines)
- [Browser Compatibility](#browser-compatibility)
- [License](#license)

---

## Overview

In apparel manufacturing, shade variation across fabric rolls belonging to the same production order is a major source of factory rejections, uneven garments, and expensive waste. 

Traditional visual inspection under light booths is subjective and prone to human error. **Shade Match** provides factory QC teams with an objective, digital colorimetry workflow using device cameras or uploaded swatch photos to calculate true $\Delta E_{2000}$ color distance.

---

## Key Features

- **Accurate CIEDE2000 & CIE76 Color Engine**: Implements the international standard ISO/CIE 11664-6 / ASTM D2244 color difference formula.
- **Interactive Swatch Sampling**: Move and resize an active sampling box over fabric images on an HTML5 Canvas with real-time HEX, RGB, HSL, and CIELAB ($L^*, a^*, b^*$) computation.
- **Trimmed-Mean Noise Reduction**: Filters out shadows, fabric textures, weave specularities, and pixel noise by trimming extreme pixel values before averaging.
- **Reference-Locked Comparison**: Automatically filters test batches by Order Number so comparisons only occur within the same production contract.
- **Side-by-Side Swatch Inspection**: Visual swatch juxtaposition, Delta E gauge, channel difference bars ($\Delta L^*, \Delta a^*, \Delta b^*$), and descriptive shade direction notes (e.g., *"lighter, more yellow"*).
- **Pairwise Comparison Matrix**: Automatically generates an $N \times N$ matrix when comparing 3 or more batches simultaneously.
- **History & PDF/Printable Reports**: Generates formal inspection certificates complete with Inspector signature lines, tolerance flags, and remarks.
- **Offline-First Persistence**: IndexedDB database with transparent `localStorage` fallback—no cloud or network connection needed.
- **Data Portability**: Full JSON backup import/export and CSV inspection history download.
- **Factory-Grade Ergonomics**: Responsive Indigo (`#2F3E9E`) and Warm Yellow (`#F5B800`) UI, Dark & Light theme toggle, desktop collapsible sidebar, and mobile bottom navigation.

---

## Colour Science Pipeline

### Color Space Transformations

```
sRGB (8-bit [0-255])
       │  Gamma expansion (sRGB transfer function)
       ▼
Linear RGB [0.0 - 1.0]
       │  Standard 3x3 sRGB-to-XYZ transformation matrix
       ▼
CIE 1931 XYZ (D65 standard illuminant, 2° standard observer)
       │  Cube root non-linear compression (CIE 1976)
       ▼
CIELAB (L*, a*, b*)
       │  Chroma weighting, hue rotation, SL, SC, SH, RT
       ▼
CIEDE2000 (ΔE₀₀) & CIE76 (ΔE*₇₆)
```

1. **sRGB to Linear RGB**: Corrects the non-linear gamma curve:
   $$\text{linear}(C) = \begin{cases} \frac{C/255}{12.92} & \text{if } C/255 \le 0.04045 \\ \left(\frac{C/255 + 0.055}{1.055}\right)^{2.4} & \text{otherwise} \end{cases}$$

2. **Linear RGB to CIE XYZ (D65 Reference)**:
   $$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \begin{bmatrix} 0.4124564 & 0.3575761 & 0.1804375 \\ 0.2126729 & 0.7151522 & 0.0721750 \\ 0.0193339 & 0.1191920 & 0.9503041 \end{bmatrix} \begin{bmatrix} R_{\text{lin}} \\ G_{\text{lin}} \\ B_{\text{lin}} \end{bmatrix}$$

3. **XYZ to CIELAB**:
   $$L^* = 116 f(Y/Y_n) - 16, \quad a^* = 500 [f(X/X_n) - f(Y/Y_n)], \quad b^* = 200 [f(Y/Y_n) - f(Z/Z_n)]$$
   *Where $X_n = 0.95047, Y_n = 1.00000, Z_n = 1.08883$ (D65 white point).*

4. **CIEDE2000 Calculation ($\Delta E_{00}$)**:
   Accounts for perceptual non-uniformities in CIELAB, incorporating lightness ($S_L$), chroma ($S_C$), hue ($S_H$) weighting factors and the hue-rotation interactive term ($R_T$) in the blue region.

---

### CIEDE2000 Tolerance Standards

| $\Delta E_{2000}$ Range | Result Verdict | Action Required |
|---|---|---|
| **$< 1.0$** | **Excellent Match** | Approved for immediate cutting & sewing |
| **$1.0 - 2.0$** | **Good Match** | Commercially acceptable for all panels |
| **$2.0 - 3.5$** | **Acceptable** | Acceptable; avoid pairing in adjacent garment panels |
| **$3.5 - 5.0$** | **Warning** | Borderline variation; QC supervisor review required |
| **$> 5.0$** | **Shade Mismatch** | Batch rejected; do not mix with reference roll |

*The tolerance threshold defaults to $\Delta E = 3.0$ and is user-configurable in settings.*

---

### Trimmed-Mean Pixel Sampling

Fabric weaves and knit textures create micro-shadows in troughs and specular highlights on crests. Rather than a naive average that skews toward noise, **Shade Match** employs an interquartile trimmed-mean filter:
1. Samples all non-transparent pixels inside the user's bounding box.
2. Sorts channel intensity arrays independently.
3. Trims the top and bottom 10% outlier pixels.
4. Calculates the mean of the central 80% distribution.

---

## Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Shade Match                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     index.html                        │  │
│  │   Semantic HTML5 • Accessible Modals • Responsive Grid│  │
│  └──────────────┬─────────────────────────┬──────────────┘  │
│                 │                         │                 │
│                 ▼                         ▼                 │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │        style.css        │   │        script.js        │  │
│  │  • CSS Custom Properties│   │  • ColourSci Engine     │  │
│  │  • Dark/Light Theme     │   │  • HTML5 Canvas Sampler │  │
│  │  • Responsive Sidebar   │   │  • Camera API           │  │
│  │  • Mobile Bottom Nav    │   │  • IndexedDB (DBv2)     │  │
│  │  • Print Stylesheets    │   │  • CSV/JSON Exporters   │  │
│  └─────────────────────────┘   └─────────────────────────┘  │
│                                           │                 │
│                                           ▼                 │
│                                ┌─────────────────────────┐  │
│                                │   Browser Storage       │  │
│                                │   • IndexedDB: Batches  │  │
│                                │   • IndexedDB: Reports  │  │
│                                │   • localStorage (sync) │  │
│                                └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ShadeMatch-App/
├── index.html        # Clean semantic structure & hash router
├── style.css         # Complete CSS styling, themes, & print rules
├── script.js         # Colorimetry math, canvas engine, & data store
└── README.md         # Documentation & user guide
```

---

## Getting Started

### 🌐 Live Web Application

Access the hosted web application directly:
**[https://aruni302.github.io/ShadeMatch-App-MAPT22B136/#dashboard](https://aruni302.github.io/ShadeMatch-App-MAPT22B136/#dashboard)**

### Prerequisites

No build tools, Node.js, Python, or web servers are required. Any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari) will run the application.

### Running Locally

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Aruni302/ShadeMatch-App-MAPT22B136.git
   cd ShadeMatch-App-MAPT22B136
   ```
2. Double-click `index.html` or open it directly in your browser:
   ```text
   file:///path/to/index.html
   ```
3. *(Optional)* Serve through any local HTTP server:
   ```bash
   # Python 3
   python -m http.server 8080
   
   # Node npx
   npx serve .
   ```

---

## User Guide

### 1. Registering Batches
- Navigate to **Add New Batch** (`#add-batch`).
- Enter the **Batch Number** (unique identifier), **Order Number**, fabric type, supplier, and receive date.
- Choose to **Take Photo** via device camera or **Upload Image** (JPEG, PNG, WebP up to 20MB).

### 2. Fabric Image Sampling
- Drag and resize the yellow sampling box over a flat, representative region of the fabric swatch.
- The sampling engine will automatically trim noise and calculate exact HEX, RGB, HSL, and CIELAB coordinates.
- Click **Save Batch** to persist the record into IndexedDB.

### 3. Running Comparisons
- Go to **Compare Batches** (`#compare`).
- Select a **Reference Batch**.
- The system automatically loads all available **Test Batches** sharing the same Order Number.
- Check one or multiple test batches and click **Run Comparison**.
- Inspect the visual gauge, channel differences, and verdict badges.

### 4. Comparison Reports & History
- Click **Save Report** with the inspector's name and remarks.
- Access saved comparisons anytime under **History & Reports** (`#history`).
- Click **View** on any report to open the certificate view and press **Print** for a printer-optimized paper certificate.

### 5. Backup & Data Management
- In **Settings** (`#settings`):
  - Click **Load Demo Data** to populate five realistic navy knit batches for instant testing.
  - Click **Export All Data (JSON)** for complete offline backups.
  - Click **Export History (CSV)** to download comparison logs into Microsoft Excel.

---

## Fabric Photography Guidelines

To ensure precise colorimetric measurement, follow standard factory lighting protocols:

1. **Standard D65 Daylight**: Photograph swatches under standardized D65 lighting booths (6500K) or near diffused, north-facing daylight.
2. **Never Use Camera Flash**: Camera flash causes intense specular reflections that overwhelm fabric color data.
3. **Consistent Distance & Angle**: Keep camera height and orientation perpendicular ($90^\circ$) to the swatch.
4. **Eliminate Wrinkles & Folds**: Mount the fabric swatch completely flat on a neutral medium-grey or white backing board.
5. **Batch Lighting Consistency**: Always photograph test batches and reference standards in identical lighting conditions.

---

## Browser Compatibility

| Browser | Minimum Version | Tested & Verified |
|---|---|---|
| **Google Chrome** | 80+ | Yes |
| **Microsoft Edge** | 80+ | Yes |
| **Mozilla Firefox** | 75+ | Yes |
| **Apple Safari** | 13.1+ | Yes |
| **Android Chrome** | 80+ | Yes |
| **iOS Safari** | 13.4+ | Yes |

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
