---
title: Home
---

# Home

## Introduction

**Mecha4** is a 3D-printed **robotic fish** designed for MEC 482 Mechatronics at Abu Dhabi University (Fall 2026, Dr. Claudio Vignola).
A tail drive propels the fish, two pectoral fins tilt it up and down, and a dorsal fin steers it left and right. The electronics live in a sealed tube inside the fish body.

_Team: Basil Ahmed, Talha, Hamad_

## Research Question

* Can a low-cost (under 200 AED) 3D-printed robotic fish be fully waterproof and controlled with servos and an ESP32?
* How should the fins and rudder be arranged to give independent control of depth and heading?
* How much ballast is needed to make the fish neutrally buoyant?

## Background

![Robotic fish render](fish-exterior.png)

The body is a fish-shaped skin that floods with water. Inside it sits a sealed "dry pod" with an O-ring end cap that holds the ESP32, servos and battery. Only thin shafts leave the pod, each through two greased O-rings.

[link to background](background)

## Results

1. Fish size: 398 × 100 × 125 mm.
2. Mass about 1.04 kg printed, about 1.4 kg with ballast to be neutrally buoyant.
3. Every component and printed part was checked in CAD for interference: none found.
4. Water tests and swimming results: _to be added after printing and testing._

## Conclusions and Future Work

The CAD design fits all components with no clashes. Next steps are printing the parts, leak testing the pod, tuning the ballast and measuring swim speed and turning radius.

## External Links

[Interactive swim simulator](simulator.html)
[Design page: parts and electronics](design.html)
[Waterproofing calculators](waterproofing.html)
[CAD and print files](files.html)
[Source on GitHub](https://github.com/Kr1-b/Mecha4.guthub.io)

## References

1. Scharff, R. et al. "OpenFish: Biomimetic design of a soft robotic fish for high speed locomotion." HardwareX, 2022.
2. "A Low-Cost and Open-Source Robotic Fish Using 3D Printing Technology." IEEE, University of Limerick.
3. "Scalable Dual-Servo Pectoral Fin Platform for Biomimetic Robotic Fish." Machines 14(1), 121, 2026.
