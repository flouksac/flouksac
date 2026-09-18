---
title: "RFC 1149 v2 : Duh, Does The Pigeon Gets an Upgrade ?!"
date: 2026-18-09
draft: false
deck: "Welcome to the first article covering my new rabbit hole: learning computers was cool, but can they fly ?"
image: "/images/thumbs/pigeon-goes-brrr.png"
tags: ["fpv", "warflying", "crafting","wifi"]
playlists: ["Red Teaming Drone ?"]
---


{{< callout title="Articles under heavy construction" >}}
This project is still in its early stages, so this article will probably be updated frequently.
{{< /callout >}}

## 00 // Ground Control to Major Tom

Like me, you've probably built a computer at least once in your life. \
If not, you lose -1000 aura... (yes, that was free, do not forget **my blog == my rules**)

**But could the one you built actually fly?**

Your answer might be yes, especially if throwing it out of your window counts as flying for two seconds before smashing into the ground. \
Personally, I don't think it does...

My answer was no as well. \
I've never built a computer that could fly, land, and then fly again (hopefully without becoming an expensive crater in the process.)

**You may now be wondering why any sane person would want to build a flying computer in the first place.**

I got this idea with my friend baldplayer123, a few weeks after discovering the fascinating world of PCBs and soldering for the first time during a great workshop organized in Lille at the PassTheSalt 2026 conference by tcccorp : [Design Your First PCB: From Concept to Board](https://cfp.pass-the-salt.org/pts2026/talk/AACNG9/). 

For some time, I'd felt the need to build something with my hands, and, for once, not mostly with my keyboard as i'm use to. 

Maybe I'd had enough of seeing shitty tools being vibe-coded as if everyday someone reinvente the new screwdriver-3000. \
Maybe I was tired of the daily stream of speculative AI news telling us we're all going to be replaced. \
Maybe I just needed to touch some grass.

Or, at the very least, build something tangible with my own hands for once.

Most of the projects I've worked on over the last 5 years have barely involved hardware, soldering, PCB design, electronics, or 3D printing. I saw this project as a great opportunity to learn cool stuff, build cool stuff, and get far outside my comfort zone.

Ok cool, 

Now I want to build a flying computer.

**But what's the point ?**

What can a flying computer do that a normal one can't? /
You've probably heard of wardriving. /
But warflying? /
Remote Wi-Fi pentesting?! /
A flying network implant teleguided from the hotel ?!! /

So this first article will follow my journey from **ZERO** to **UFO**, into the wonderful world of FPV, from the point of view of a red teamer.

If you keep reading, you may even discover whether it flies, how to built it, and whether it actually succeeds at its mission.

And don't be effrayed, i'm not a specialist of fpv/hardware topics so I'll try to keep everything accessible even if you've never built a computer before. (Although, obviously, that's an other -1000 aura + Skill issue)

## 01 // Wake the f\*ck up, Samuraï! We have a drone to build.

I've always loved starting a new project from a completely blank page.

My favorite part of any personal project is probably the slightly unhealthy amount of research I do before building anything: taking one big potato problem and breaking it down into small potato problems.

For me, it's always been important to understand as much as possible about the ins and outs of something before actually touching it.

And again this time, the potato was not tiny.

I had to learn about FPV, soldering, PCBs, electronics, IoT, radio protocols, regulations, 3D modeling, onboard systems...

I'll go into all of that later. For now, let's stay on the methodology side.

Today, despite being flooded with content every single day, I found something quite paradoxical that finding valuable documentation about companion computers, warflying, or custom FPV builds that weren't designed for dropping bombs wasn't particularly easy (or maybe that's just my Dunning–Kruger speaking :p)  \ 

As far as I remember, the first person I heard about attempting something similar  (a kind of Wi-Fi pentesting drone ) was Nicolas Bourras, aka [vivescere](https://nicolasb.fr/). I saw his talk at SecSea 2024, although I can't remember how far he eventually pushed the project.

Then came the dorking.

"drone"
"wardriving"
"warflying" ...

And combinations of basically everything in between.

At best, I found things like random Redditors strapping a Pwnagotchi onto a DJI drone.

Which is cute.

But it's not quite as ambitious as what I have in mind. I wanted something handmade, ready to use, and as open source as possible.

Since I couldn't find that much relevant material about DIY warflying drones, I went back to the basics to ask :

**Why aren't more people building wardriving drones?**

I have a few hypotheses.

1. The form factor is seductive, but also extremely limiting. Even with a decent setup, flight time is measured in minutes rather than hours. Every additional payload adds weight, and every gram eventually translates into compromises somewhere else.

2. The whole platform is also more expensive, fragile, and skill-intensive than simply putting your gear into a backpack.

3. Then there are regulations. Depending on the country, flying close to buildings, populated areas, or beyond certain distances can quickly become complicated or outright prohibited depending on the aircraft, location, and type of operation.

4. And my last hypothesis is simply: "Flying electronics covered in antennas can look scary as fuck to random people, especially in city given the geopolitical context."

I'll leave the last one as it is.

Ultimately, a car, a bike, a backpack, or simply walking around would probably make much more sense for exhaustive wardriving.

But a drone has some interesting properties of its own.

It's fast. \
It's mobile. \
It can reach places you can't. \
And being above ground changes the radio environment considerably.

That's also why I'm much more interested in giving a drone hacking capabilities than randomly flying one around a city.

Using it during pentests or red team engagements, on locations where the operation and flight are explicitly permitted, sounds both more interesting and much better for my sleep.

Anyway.

Back to our moutons.

For several weeks, I read everything I could find about building FPV drones from scratch. What the different components do, how flight controllers work, how a companion computer can communicate with onboard electronics, how UART and MAVLink fit into the picture, how to solder all those expensive little Lego bricks together without immediately turning them into smoke.

Time to break the glass and talk about what I actually understood.

## 02 // Anatomy of a Flying Computer

**FPV** stands for **First Person View**.

Broadly speaking, it refers to flying an aircraft while seeing through a camera mounted on it, usually through FPV goggles, basically a weird VR-looking headset with samsam's antennas sticking out of it.

But when people talk about an "FPV drone", they're often referring to custom-built quadcopters rather than the ready-to-fly camera drones you might normally associate with the word drone popularized by dji/parrots.

And FPV drones come in a lot of flavors.

At the tiny end, you have Tinywhoops. They are ridiculously small drones that basically look like mosquitoes on steroids.

Then you have the more traditional FPV sizes, the more acrobatics one are: 3", 3.5", 5", and so on, where the number refers to the propeller diameter.

Around 7" and above, you start entering another territory which is long-range FPV.

As the incredibly mysterious name suggests, these machines are designed with longer-distance and more efficient flights in mind. 
They're generally larger, heavier, less focused on aggressive freestyle flying, and often used by people who want to film beautiful mountains and landscapes.

But I do not give a fuck about filming landscapes.

**I want a flying computer.**

More specifically, I want a drone capable of carrying a companion computer and the additional hardware required for my experiments without immediately falling out of the sky.

So I decided to bet on a long-range platform rather than a smaller FPV build.

Now that we know roughly what kind of flying creature  we're talking about, let's see what's actually inside one.

|Component|responsability|
|---|---:|
|Frame	            |The skeleton holding everything together|
|Motors	            |Sucks electricity into angry spinning|
|ESC	            |Controls how angry each motor should scream|
|Flight Controller	|The drone's tiny brain|
|Propellers	        |Convert angry spinning into flying/lift|
|Battery	        |Seriously ? you can't imagine what a battery is ?|
|FPV Camera	        |Your cyclope eye in the sky|
|Video Transmitter	|Sends the video stream of the camera back to you|
|Radio Receiver	    |Lets the drone hear your questionable decisions|
|GPS	            |Usefull for comming back to home after an escursion as an ingrat cat looking for food|
|Companion Computer	|The second brain — and the reason we're here|


---------

More is comming