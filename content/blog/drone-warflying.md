---
title: "RFC 1149 : Duh, Does The Pigeon Gets an Upgrade ?! - part 00"
date: 2026-18-09
draft: false
deck: "Welcome to the first article covering my new rabbit hole: learning computers was cool, but can they fly ?"
image: "/static/images/thumbs/pigeon-goes-brrr.png"
tags: ["fpv", "warflying", "crafting","wifi"]
playlists: ["Red Teaming Drone ?"]
---


{{< callout title="Articles under heavy construction" >}}
This project is still in its early stages, so this article will probably be updated frequently.
{{< /callout >}}


## 00 // Ground Control to Major Tom

Like me, if you're reading this around the time I'm writing it, 
you probably use AI every week (or every day) to help with various tasks.

Without trying to kick down doors that are already wide open, 
I think we all know by now that AI can be both a blessing and a curse.

You can create, build and ship things absurdly faster than before. 
At the same time, it has never been easier to get the illusion that you understand something simply because a model managed to do it for you.

I'm not here to judge how people use AI. 
There are plenty of good uses and plenty of terrible ones.

I'm probably not even in a good position to pretend otherwise: 
part of what I'm currently specializing in is offensive tooling involving AI and the security of AI systems themselves.

But over time, something started to feel... exhausting.

I'm not exactly sure when it started.

Maybe it was seeing people farm school grades, certifications, projects and CTFs as if they were grinding Platinum Trophies without actually learning much along the way.

Maybe it was the slightly uncomfortable realization that I'm still relatively junior in an industry where an increasing amount of what we do can now be imitated (sometimes impressively well) by AI sold by gigantic technology corporations. It's scary to think how the futur of cybersecurity employment in France for juniors will be...

Maybe I just got tired of seeing yet another vibe-coded tool solving a problem nobody had.

I plead guilty too, by the way. Front-end development isn't exactly the part of computer science that wakes me up excited in the morning.

Or maybe I simply got tired of reading publications clearly written with AI by people who didn't seem to understand what they were publishing.

At some point I realized that AI everywhere had slowly removed part of the fun from things I used to genuinely enjoy.

Today, if I want to stay productive, I feel almost obligated to use it: coding, documentation, research, boilerplate, debugging...

And that's incredibly useful.

But I also miss something.

I remember learning development with Stack Overflow, asking stupid questions to DuckDuckGo, getting stuck for an hour because of one stupid bug, digging through documentation, writing code for days or weeks, and eventually being quite proud of something that probably isn't even that impressive today.

The important part was that I knew it.

I knew why every of my function existed.

I knew which terrible decision had produced which terrible workaround.

I had suffered enough while building it that, by the end, the thing genuinely felt like mine and I learn something.

As my studies progressed, the way I approached software naturally changed. 
I started spending more time on architecture, UML, testing, interfaces and system design. Looking at projects as a whole complete systems rather than piles of source files.

Cybersecurity came all along.

When I started learning security in high school 6 years ago, general-purpose AI assistants weren't part of the picture yet. 
I was happily farming TryHackMe rooms and learning paths for a completely meaningless daily streak and leaderboard position, discovering topics that would later become part of my actual job. Then came PortSwigger Academy, web vulnerabilities, conferences, homelabs, CTFs... all the good stuff.

And then I basically got a front-row seat to the arrival of generative AI in higher education.

I remember doing a presentation about the Turing test during my first year of university.

Not long after that, ChatGPT 3 or 3.5 became publicly available.

Then things got progressively weirder.

Watching entire assignments, projects and eventually diplomas being carried by OpenAI or Anthropic subscriptions certainly didn't help my growing overdose.

Professionally, I still use these tools. A lot.

They're too useful not to.

But recently somewhere between architecture diagrams, test, microservices skeletons, specifications and increasingly autonomous coding agents, I started asking myself a slightly uncomfortable question:

**Where the f\*ck is the fun left?**

How do you remain proud of something when you barely struggled while making it?

How do you make sure you're still learning rather than simply becoming very good at delegating/copying?

How do you keep finding meaning in your work or at technical craft while increasingly large parts of that craft can be done by LLM produced by companies that would love to replace you by their own SaaS if they could ?

How to not be a proxy meat in 5 years ? 

I don't pretend to have an answer. But there are so much things we can still discuss as long as it affects our domain this deeply.

I knew since a long time I wanted to build something again. \
Something physical. \
Something that could burn, break, fall out of the sky, or at least force me to understand what I was doing before pressing Enter.

Feeling this has been hard, i needed to recover this periode where everything i did was building by my own, creating something tangible i'm proud of. 

A few weeks before, I attended a great workshop organized by tcccorp during PassTheSalt 2026 in Lille : \
[Design Your First PCB: From Concept to Board](https://cfp.pass-the-salt.org/pts2026/talk/AACNG9/)

That was my first proper introduction to PCB design and soldering.

And soldering was so fun.

With my friend **baldplayer123**, we left with the obvious conclusion that we needed a hardware project.
Most of the things I've built during the last five years have barely involved electronics, soldering, PCB design, embedded systems or 3D printing. So whatever we picked, I wanted it to force me far outside my usual comfort zone.

We initially needed an excuse to design a PCB. \
But designing a random PCB just for the sake of ordering one felt slightly pointless for me.

If we were going to spend money and several months learning hardware, I wanted the board to be one small part of a larger project that actually made sense and that i can keep.

And one idea kept coming back.

**Could a computer I built actually fly?**

While preparing one of my first physical intrusion scenarios, I had already wondered how useful it could be to position a network implant close to a target without necessarily having to physically enter the building first.

The idea sounded suspiciously similar to something my teenage brain had already seen in Watch Dogs 2,
flying a drone accross vents and using it as an extension of your hacking capabilities.

Obviously, real life tends to contain slightly more physics, regulations and disappointment than Ubisoft games.

Still, the idea stuck.

So the project slowly became more concrete and realist, i have to build an FPV quadcopter carrying a Linux companion computer, its own power subsystem and additional radio/network interfaces, and see whether it can that useful during operations.

That's what this series of articles is about.

I will show you every layer well enough to design it, build it, break it, repair it, use it.


## 01 // The Red Team problem I want to solve

Red Team engagements tend to combine several attack surfaces rather than treating security as a purely technical problem.

For the purpose of this project, I like to think our operations as three broad families:

- attacks against information systems and exposed technical assets;
- social engineering against humans and organizational processes;
- physical access to places, devices and infrastructure.

Those categories obviously overlap for example : 

- Phishing combines a technical delivery mechanism with social engineering.
- Tailgating combines social manipulation with physical intrusion.
- bypassing NAC controls is the interaction between network and physical.

Wireless infrastructure sits in a similarly awkward place.

A Wi-Fi access point, Bluetooth device or IoT radio can be part of an internal information system while simultaneously exposing radio signals outside the physical perimeter that supposedly protects it.

That boundary is what I want to explore as Physical intrusion can be difficult depending of the level of awaireness, training, mitigations.

It requires preparation, timing, social skills, operational security and often a healthy amount of luck.

In some environments, simply getting close enough to the infrastructure you want to observe can become the main constraint.

Walls attenuate radio signals.

Access points may sit deep inside offices or above floors that cannot easily be approached from public space or street.

Bluetooth and IoT devices can have much shorter practical ranges.

And sometimes the interesting physical location simply isn't accessible from ground level.

This is where an aerial platform becomes interesting. A drone can move a radio receiver vertically as well as horizontally.

It can potentially inspect radio environments from angles that are difficult to reach from the ground.

It can also provide useful physical reconnaissance information as rooftops, access paths, cameras, external equipment, possible landing areas or simply a better understanding of the geometry of a site.

Whether any of that is worth the enormous amount of additional complexity is precisely one of the questions this project needs to answer.

Because the alternative is obvious.
I could put the exact same computer and Wi-Fi adapter inside a backpack.

The backpack would probably have ten times the autonomy.

It wouldn't require a pilot. \
It wouldn't fall out of the sky. \
It would attract significantly less attention. 

And it would be much cheaper too.

One scenario that originally motivated the project is the following :

During an engagement, fly close to a building remotly from the hotel, land the quad onto the roof  of the target, shut down the power-hungry flight systems while keeping a low-power companion computer alive, and use that computer as a remotely administered wireless assessment computer.


## 02 // capabilities of the red team drone

Before buying motors, antennas or suspiciously cheap electronic boards from the Internet, I needed to define what I actually wanted the drone to do.

Otherwise this project would very quickly become the hardware equivalent of installing every Kali tools because maybe one of them will be useful someday without knowing what's installed.

The first version therefore has two separate capability sets:

1. cyber / RF capabilities provided by the companion computer;
2. drone capabilities required to deliver, operate and recover that computer.

### Companion-computer capabilities

| Capability            | Purpose                                                                              | passive/active | v1 priority  |
| -----------------------| --------------------------------------------------------------------------------------| ----------------| --------------|
| Wifi Discovery        | Observe nearby wireless infrastructure and basic radio metadata                      | Passive        | Required     |
| Wifi Pentesting       | Perform testing of wireless infrastructure                                           | Active         | High         |
| SSID/BSSID with GPS   | Build geolocated observations for wardriving/warflying experiments                   | Passive        | High         |
| Remote administration | Securely manage the companion computer while deployed                                | both           | High         |
| Rogue AP              | Credential stealing via phishing on a fake networks                                  | active         | Medium       |
| Bluetooth discovery   | Observe nearby Bluetooth ecosystems and experiment with another short-range protocol | active         | nice to have |
| Bluetooth Pentesting  | Explore BLE/Bluetooth attack surfaces                                                | active         | nice to have |
| Zigbee / Thread / IoT | Extend the payload toward common embedded/home-automation protocols                  | active         | nice to have |

All of the companion-side capabilities should eventually live behind a small framework I'm building for the project.

The current idea is to use Rust for the core, with Python where using existing libraries makes more sense than rewriting half of the wireless ecosystem because I suddenly developed a personality disorder.

The exact software architecture deserves its own article later, so i will cover that later !

For now, the main requirements are simple:

- small / light foot print
- reproducible
- easy to deploy
- resilient to losing the remote connection as a state machine
- able to correlate radio observations with flight/GPS telemetry
- sufficiently modular that adding a new radio or protocol doesn't require rebuilding the entire framework.

### Aircraft capabilities

| Feature                               | Purpose                                                                  | v1 priority |
| ---------------------------------------| --------------------------------------------------------------------------| -------------|
| Stable manual flight                  | The project becomes significantly less useful if converted into confetti | Required    |
| Reliable RC link                      | Maintain control over the aircraft                                       | Required    |
| GNSS positioning                      | Positioning, telemetry and navigation support                            | Required    |
| Failsafe / Return-to-Home             | Recover safely after selected failure conditions                         | Required    |
| Companion-computer power              | Keep the payload electrically independent and stable                     | Required    |
| Flight telemetry exposed to companion | Correlation of cyber/RF data with aircraft position/state                | Required    |
| Companion isolation                   | Payload crash must not interfere with flight control                     | Required    |
| Long-range-oriented efficiency        | Carry additional payload without destroying endurance                    | High        |
| Recorded FPV feed                     | Useful for engagement evidence                                           | High        |
| Independent payload startup/shutdown  | Better energy management on the ground                                   | Medium      |
| Autonomous mission planning           | Enable planning for operations                                           | Optional    |


## 03 // State of the art 

Before inventing the screwdriver-3000, it is generally a good idea to check whether somebody has already invented the screwdriver and wireless reconnaissance from moving platforms is obviously not new.

### Wardriving

At its simplest, wardriving consists of moving through an area while detecting nearby wireless networks and associating those observations with location data.

Historically, the setup was beautifully primitive:

- a laptop, 
- a Wi-Fi adapter, 
- external antennas, 
- a GPS receiver 
- a car

One of the well-known early public demonstrations came from security researcher Pete Shipley in 2001, driving around San Francisco with an external antenna, laptop and GPS while mapping wireless networks.

With time almost everything required to do it became smaller, cheaper and considerably more accessible.

A modern phone can contain GNSS, Wi-Fi, Bluetooth, cellular connectivity, storage, a battery and enough compute power to perform tasks that once justified carrying a laptop covered in adapters.

Projects such as (WiGLE)[https://wigle.net/] (the Wireless Geographic Logging Engine) turned individual observations into a collaborative geographic dataset. 
WiGLE has existed since 2001 and accepts geolocated wireless observations including network identifiers and security information. 
Its modern Android client can log Wi-Fi, Bluetooth and cellular observations together with their geographic position.

You can find on this site valuable information such as SSID, BSSID, channel or operating frequency, advertised capabilities, supported security mechanisms, signal-strength measurements from the receiving device, timing and vendor-related information in some cases...

An SSID is the human-readable network name being published (for ex : something like E-Corp-Lobby)

A BSSID normally identifies a particular basic service set and is commonly represented by the MAC address of the radio interface associated with that access point.

A company can have twenty access points broadcasting the same SSID while each one exposes a different BSSID.

This is important to repeat that observing isn't piracy, passive listen isn't hacking as the frontier may be unclear. 

### From wardriving to warflying

Once wardriving exists, the obvious question for somebody with poor financial judgment is to know what happens if we move the receiver into the air ?

The term warflying is less common, it has been used to as the idea of performing wireless reconnaissance or mapping from an aircraft or drone rather than from a ground vehicle.

And this is where the available material becomes surprisingly fragmented.

Searching for wardriving produces decades of tools, writeups, datasets and projects.

Searching for warflying usually produces a much lighter mixture (could also be a dunning-kruger :p ):

- research experiments by hobbyist attaaching wifi hardware or whatever to commercial drones
- few (un)documented conference talks
- security projects that never comme to life
- abandoned GitHub repositories.

As far as I remember, the first person I heard about attempting something similar  (a kind of Wi-Fi pentesting drone ) was Nicolas Bourras, aka [vivescere](https://nicolasb.fr/). I saw his talk at SecSea 2024, although I can't remember how far he eventually pushed the project.

Then came the dorking.

"wardriving drone"
"pentesting drone"
"computer companion hacking"
"warflying"

...and progressively worst combinations of so much of them.

At best, I found things like random Redditors strapping a Pwnagotchi onto a DJI drone.

Which is cute.

But it's not quite as ambitious as what I have in mind. I wanted something handmade, ready to use, and as open source as possible.

What interested me was the engineering around it, so i'll figure it by my own:

- why a particular frame?
- how much payload?
- what happens to flight time?
- how is the companion computer powered?
- how electrically noisy is the drone?
- where do the antennas go?
- how does the Linux system communicate with the flight controller?
- what happens when the companion crashes?
- how are RF observations correlated with precise position?
- does altitude genuinely improve anything?
- how repeatable are the measurements?
- what are the actual regulatory constraints?
- was using a drone actually worth the trouble?

That last question is easy to forget.

Because drones are cool. \
Putting Linux on things is cool. \
Antennas sticking out of carbon fiber make everything approximately 67% more cyberpunk.

The rest of this series is basically an expensive experiment designed to find out whether that project survives contact with physics and if i will be able to make the good decisions.



---------

More is comming