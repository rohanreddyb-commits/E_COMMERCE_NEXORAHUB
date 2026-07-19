---
name: Neo-Luxury Minimalist
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#006a60'
  on-secondary: '#ffffff'
  secondary-container: '#65f9e6'
  on-secondary-container: '#007166'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#65f9e6'
  secondary-fixed-dim: '#41dcca'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.02em
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
This design system targets a high-end, contemporary fashion demographic that values both architectural minimalism and the vibrant energy of modern streetwear. The aesthetic is defined by "Quiet Luxury with a Digital Pulse"—merging the stark, intentional whitespace of high-fashion editorials with high-performance digital accents.

The emotional response should be one of sophisticated calm punctuated by moments of electric focus. We utilize a **Modern Minimalist** style with **Glassmorphism** influences for overlays and a **Tactile** approach to card depth. The interface feels premium through its refusal to clutter, relying on precision alignment, thin hairlines, and expansive negative space to frame the product as art.

## Colors
The palette is rooted in a high-contrast monochromatic foundation to ensure maximum legibility and a "gallery" feel. 

- **Foundation:** Pure White (#FFFFFF) is the primary surface color to provide a clean, expansive canvas.
- **Sectioning:** Light Gray (#F9F9F9) is used for subtle background shifts to differentiate content blocks without introducing visual noise.
- **Typography & Core Elements:** Deep Black (#000000) is used for all primary text and structural elements, providing a heavy, authoritative anchor.
- **Accent:** Neo-Chrome Teal (#37D6C4) is the singular point of high-energy color. It is reserved exclusively for primary calls to action, active states, and critical highlights to draw the eye with surgical precision.

## Typography
The typography strategy creates a tension between the expressive, characterful headlines and the clinical, functional body text. 

**Headlines** use a bold, contemporary grotesque to provide a "streetwear" edge—tight tracking and heavy weights are preferred for impact. **Body text** is set with generous line heights and slight positive letter-spacing to evoke a sense of airiness and luxury. **Labels** (metadata, prices, categories) are always set in uppercase with wide tracking (10%) to maintain a structural, architectural feel.

## Layout & Spacing
The layout follows a **Fluid Grid** model based on an 8px rhythmic system. On desktop, we utilize a 12-column grid with wide 24px gutters. Margin sizes scale aggressively: 24px on mobile, 48px on tablet, and 80px+ on desktop to emphasize exclusivity.

Content should be grouped using "Zone Spacing"—large gaps (80px-120px) between distinct sections to allow the eye to rest. Elements within a group should use the 'md' (24px) spacing unit to maintain a tight, cohesive relationship.

## Elevation & Depth
Depth is communicated through **Soft Shadows** and **Tonal Layers** rather than heavy gradients.

- **Level 0 (Surface):** Pure White.
- **Level 1 (Cards/Sections):** Light Gray (#F9F9F9) or White with a 1px #E5E5E5 border.
- **Floating Elements:** Modals and dropdowns use a very soft, highly diffused shadow (0px 12px 40px rgba(0,0,0,0.05)) to suggest they are hovering just above the surface. 
- **Interactivity:** On hover, cards may lift slightly using a more defined shadow or shift to a Neo-Chrome Teal border to signal engagement. Use 8px backdrop blurs (Glassmorphism) for navigation bars to maintain context of the content scrolling beneath.

## Shapes
The shape language balances the "hard" edges of typography with "soft" containers. Standard components like inputs and small buttons use a 0.5rem (8px) radius. Larger layout containers and product cards utilize a more pronounced **rounded-xl** (24px) radius to create a friendly, tactile feel reminiscent of modern hardware design.

## Components
- **Buttons:** Primary buttons are Solid Black with White text, or Neo-Chrome Teal for "Buy" actions. They feature a generous padding (16px 32px) and no border. Secondary buttons use a 1px Black outline with wide-tracked uppercase labels.
- **Input Fields:** Minimalist underlines or 1px light gray borders. On focus, the border transitions to Black or Neo-Chrome Teal with a subtle 2px glow.
- **Product Cards:** Use the 24px corner radius. Images should have a subtle #F9F9F9 background fill to ensure product cut-outs look consistent.
- **Chips/Badges:** Small, pill-shaped, using Light Gray backgrounds with Black text. Reserved for sizes, stock status, or "New Arrival" tags.
- **Dividers:** Extremely thin (1px) and light (#E5E5E5). Use them sparingly; whitespace should be the primary method of separation.
- **Navigation:** Top-fixed, semi-transparent (glass) blur with a thin bottom border.