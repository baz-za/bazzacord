/**
* -~-~-~ Main Rosiecord Patch Script -~-~-~
* Build to Patch Enmity, Icons, Fonts, and Other Tweaks into the Base Discord IPA.
* Created by Rosie "Acquite" on Thursday 22st December 2022.
* Required Dependencies: PLUTIL, LOCAL_DIRS[Fonts, Icons, Enmity_Patches{Required, Optional}], AZULE
*/


import { exec, ExecException } from 'child_process';
import fs from 'fs';

class Colors {
    RED: string = '\x1b[91m';
    GREEN: string = '\x1b[92m';
    BLUE: string = '\x1b[94m';
    PINK: string = '\x1b[95m';
    CYAN: string = '\x1b[96m';
    ENDC: string = '\x1b[0m';
}

class States extends Colors {
    PENDING;
    FAILURE;
    SUCCESS;
    constructor() {
        super();
        this.PENDING = `${this.PINK}[${this.CYAN}*${this.PINK}]${this.ENDC}`
        this.FAILURE = `${this.PINK}[${this.CYAN}-${this.PINK}]${this.RED}`
        this.SUCCESS = `${this.PINK}[${this.CYAN}+${this.PINK}]${this.GREEN}`
    }
}

class Shell {
    static async write(text: string): Promise<string> {
        return await new Promise((resolve): void => {
            process.stdout.write(text);
            resolve(text);
        })
    }

    static async run(command: string = 'ls', after = (errs: ExecException | null, output: string): void => {}): Promise<string> {
        return await new Promise((resolve, _): void => {
            exec(command, (errors, output): void => {
                after(errors, output);
                resolve(output);
            });
        });
    }

    static async runSilently(command: string = 'ls', after = (errs: ExecException | null, output: string): void => {}): Promise<string> {
        return await new Promise((resolve, _): void => {
            const finalCommand: string = command.includes('&')
                ? command.split('&')[0] + '> /dev/null ' + "&" + command.split('&')[1]
                : command + ' > /dev/null'

            exec(finalCommand, (errors, output): void => {
                after(errors, output);
                resolve(output);
            });
        });
    }
}

class Main extends Colors {
    type: string;
    outputType: string;
    constructor(type: string, outputType: string) {
        super();
        this.type = type
        this.outputType = outputType
    }

    format(item: { [key: string]: string }, type: string): string {
        return `${this.PINK}[${this.CYAN}${item.state === 'pending'
            ? '*'
            : item.state === 'success'
                ? '+'
                : '-'
        }${this.PINK}]${item.state === 'pending'
                ? this.CYAN
                : item.state === 'success'
                    ? this.GREEN
                    : this.RED
        } ${item.name} ${type}`;
    }

    load(path: string) {
        return JSON.parse(fs.readFileSync(path).toString());
    }

    async get(item: string): Promise<string[]> {
        const ipaArray: string[] = [];
        await Shell.run(item, (_, output) => {
            output.split('\n').filter(ipa => ipa!=="").forEach(ipa => ipaArray.push(ipa))
        })

        return ipaArray;
    }

    async logCurrentState (ipaStates: any[], type: string): Promise<void> {
        const defaultStates = ipaStates.map(ipaItem => this.format(ipaItem, this.type));
        const output = `${this.BLUE}${type}: [${this.PINK}${defaultStates.join(`${this.CYAN}, ${this.PINK}`)}${this.BLUE}]${this.ENDC}\r`

        await Shell.write('\r'.repeat(output.length))
        await Shell.write(output)
    }

    async Main(callable: CallableFunction): Promise<void> {
        await callable();
        await Shell.write(`\n${this.GREEN}All ${this.PINK}Base IPAs${this.GREEN} have been successfully packaged with ${this.PINK}${this.outputType}${this.GREEN}. ${this.CYAN}Continuing to the next step...${this.ENDC}\n`)
    }
}

class State {
    state: string;
    name: string;
    constructor(state: string, name: string) {
        this.state = state;
        this.name = name;
    }
}

class Inject extends Colors {
    type: string;
    outputType: string;
    hasClean: boolean;
    getParam: string;
    constructor(type: string, outputType: string, hasClean: boolean, getParam: string) {
        super();
        this.type = type;
        this.outputType = outputType
        this.hasClean = hasClean
        this.getParam = getParam
    }

    async run(M: Main, callable: CallableFunction): Promise<void> {
        const requiredPatches = await M.get(this.getParam)
        const outputIpas = await M.get('ls Dist');
        const tweakStates = requiredPatches.map(ipa => new State('pending', ipa))
        const S = new States();

        await Shell.write(`${this.CYAN}Injecting ${this.PINK}${this.outputType}${this.CYAN} into ${this.PINK}Base IPAs${this.CYAN}. If ${this.hasClean?"a ":""}${this.PINK}${this.type}${this.CYAN} has been ${this.GREEN}successfully${this.CYAN} injected in all IPAs, it will look like this: ${this.BLUE}"${S.SUCCESS} ${this.hasClean?`Example `:""}${this.type}${this.BLUE}"\n`)
        await M.logCurrentState(tweakStates, `Injected ${this.type}${this.hasClean?"s":""}`)

        for (const i in requiredPatches) {
            let patched: number = 0;
            for (const j in outputIpas) {
                const ipaName: string = outputIpas[j].split('.')[0]
                const patchName: string = requiredPatches[i]

                await callable(ipaName, patchName);
                patched++;

                const isComplete: boolean = patched===outputIpas.length;

                // @ts-ignore
                isComplete ? tweakStates.find(patch => patch.name===patchName).state = 'success' : null;
                isComplete ? await M.logCurrentState(tweakStates, `Injected ${this.type}s`) : null;
            }
        }
    }
}

const EntryPoint = async (index: number) => {
    switch (index) {
        case 0: {
            const M: Main = new Main('IPA', "Different Fonts");
            await M.Main(async (): Promise<void> => {
                const ipaList: string[] = ['GGSans', ...await M.get('ls Fonts/woff2')];
                const ipaStates: State[] = ipaList.map(ipa => new State('pending', ipa))

                await Shell.write(`${M.CYAN}Packaging the ${M.PINK}Base IPAs${M.CYAN}. If an ${M.PINK}IPA${M.CYAN} has been ${M.GREEN}successfully${M.CYAN} packaged, it will look like this: ${M.BLUE}"${M.PINK}[${M.CYAN}+${M.PINK}]${M.GREEN} Example IPA${M.BLUE}"\n`)
                await M.logCurrentState(ipaStates, "Base Font IPAs")

                await Shell.runSilently('zip -q -r Dist/Rosiecord_GGSans-Font.ipa Payload & wait $!', async (errs, _) => {
                    ipaStates[0].state = errs ? 'failure' : 'success'
                    await M.logCurrentState(ipaStates, 'Base Font IPAs')
                });
                await Shell.runSilently(`rm -rf Payload & wait $!`)

                for (const Font of ipaList.filter(ipa => ipa !== 'GGSans')) {
                    await Shell.runSilently('unzip -qq -o Dist/Rosiecord_GGSans-Font.ipa');
                    await Shell.runSilently(`cp -rf Fonts/woff2/${Font}/* Payload/Discord.app/`)
                    await Shell.runSilently(`zip -q -r Dist/Rosiecord_${Font}-Font.ipa Payload & wait $!`)
                    await Shell.runSilently(`rm -rf Payload & wait $!`)

                    // @ts-ignore
                    ipaStates.find(ipa => ipa.name===Font).state = 'success';
                    await M.logCurrentState(ipaStates, "Base Font IPAs")
                }
            })

            break;
        }
    case 1: {
        const M: Main = new Main('Tweak', 'Required Tweaks');
        await M.Main(async (): Promise<void> => {
            await new Inject("Tweak", "all Required Tweaks", true, 'ls Enmity_Patches/Required').run(M, async (ipaName: string, patchName: string) => {
                await Shell.runSilently(`Azule/azule -i Dist/${ipaName}.ipa -o Dist -f Enmity_Patches/Required/${patchName} -s & wait $!`)
                await Shell.runSilently(`mv Dist/${ipaName}+${patchName}.ipa Dist/${ipaName}.ipa`)
            })
        })

        break;
    }
    case 2: {
        const M: Main = new Main('Pack', 'Icon Packs');
        await M.Main(async (): Promise<void> => {
            await new Inject("Pack", "all Icon Packs", true, 'ls Packs').run(M, async (ipaName: string, patchName: string) => {
                await Shell.run(`unzip -qq -o Dist/${ipaName}.ipa`)
                await Shell.runSilently(`cp -rf Packs/${patchName}/* Payload/Discord.app/assets/`)
                await Shell.runSilently(`zip -q -r Dist/${ipaName}+${patchName}_Icons.ipa Payload`)
                await Shell.runSilently(`rm -rf Payload`)
            })
        })

        break;
    }
    case 3: {
        const M: Main = new Main('Tweak', "Flowercord Variations");
        await M.Main(async (): Promise<void> => {
            await new Inject("Flowercord", 'Flowercord', false, "ls Enmity_Patches/Optional").run(M, async (ipaName: string, patchName: string) => {
                await Shell.runSilently(`Azule/azule -i Dist/${ipaName}.ipa -o Dist -f Enmity_Patches/Optional/${patchName} -s & wait $!`);
                await Shell.runSilently(`mv Dist/${ipaName}+${patchName}.ipa Dist/${ipaName}+Flowercord.ipa`)
            })
        })

        break;
    }
    default:
        break
    }
}

class Divider extends Colors {
    length: number;
    constructor(length: number) {
        super();
        this.length = length
    }

    async logDivider(): Promise<void> {
        await Shell.write(`${this.PINK}-${this.CYAN}~`.repeat(this.length) + '\n' + this.ENDC)
    }
}

class Initialiser extends States {
    async PackageFlowercord(): Promise<void> {
        await Shell.write(`${this.PENDING}${this.PINK} Packaging ${this.CYAN}"${this.PINK}Flowercord${this.CYAN}"${this.PINK}. ${this.BLUE}This may take a while...${this.ENDC}\r`)
        process.chdir('Flowercord_Patcher');

        await Shell.runSilently(`rm -rf packages/*`);
        await Shell.run(`make package`, async (errs) => {
            await Shell.write(errs
                ? `${this.FAILURE} An error occured while packaging ${this.PINK}"${this.CYAN}Flowercord${this.PINK}"${this.RED}.${this.ENDC}\n`
                : `${this.SUCCESS} Successfully installed ${this.PINK}"${this.CYAN}Flowercord${this.PINK}"${this.GREEN} into ${this.PINK}"${this.CYAN}./Enmity_Patches/Optional/${this.PINK}"${this.GREEN}.${this.ENDC}\n`)
        });

        const FLOWERCORD = await Shell.run(`ls packages`);
        await Shell.runSilently(`mv packages/${FLOWERCORD} ../Enmity_Patches/Optional/flowercord.deb`);

        process.chdir('..');
    }

    async InitializeAzule(): Promise<void> {
        fs.existsSync('Azule')
            ? await Shell.write(`${this.SUCCESS}${this.PINK} Azule${this.GREEN} already exists in ${this.PINK}"${this.CYAN}./${this.PINK}"${this.GREEN}...${this.ENDC}\n`)
            : async () => {
                await Shell.write(`${this.PENDING}${this.PINK} Installing ${this.CYAN}"Azule"${this.PINK}. ${this.BLUE}This may take a while...${this.ENDC}\r`)
                await Shell.runSilently(`git clone https://github.com/Al4ise/Azule & wait $!`, async (errs) => {
                    await Shell.write(errs
                        ? `${this.FAILURE} An error occured while installing ${this.PINK}"${this.CYAN}Azule${this.PINK}"${this.RED}.${this.ENDC}`
                        : `${this.SUCCESS} Successfully installed ${this.PINK}"${this.CYAN}Azule${this.PINK}"${this.GREEN} into ${this.PINK}"${this.CYAN}./${this.PINK}"${this.GREEN}.${this.ENDC}`)
                })
            }
    }
}

const main = async (): Promise<void> => {
    const START_TIME: number = Date.now();

    const M: Main = new Main("Entry", "Entry in file");
    const S: States = new States();
    const D: Divider = new Divider(25);
    const Init: Initialiser = new Initialiser();

    const { version } = M.load('./package.json');

    await D.logDivider();

    await Shell.write(`${M.PINK} █▀█ █▀█ █▀ █ █▀▀ █▀▀ █▀█ █▀█ █▀▄\n${M.CYAN} █▀▄ █▄█ ▄█ █ ██▄ █▄▄ █▄█ █▀▄ █▄▀${M.ENDC}\n`)
    await Shell.write(`${M.PINK}A project written by ${M.CYAN}Rosie${M.BLUE}/${M.CYAN}Acquite${M.ENDC}\n`)
    await Shell.write(`${M.BLUE}This patcher is on version ${M.PINK}"${M.CYAN}${version}${M.PINK}"${M.ENDC}\n`)

    await D.logDivider();

    await Shell.write(`${S.PENDING}${M.CYAN} Clearing existing ${M.PINK}\"IPAs\"${M.CYAN} in ${M.PINK}\"./Dist\".${M.ENDC}\r`);
    await Shell.runSilently('mkdir -p Dist/ & wait $!; rm -rf Dist/* & wait $!; rm -rf Payload & wait $!;', (errs) => {
        Shell.write( errs
            ? `${S.FAILURE} An error occurred while clearing existing ${M.PINK}\"IPAs\" in ${M.PINK}\"./Dist\".${M.ENDC}\n`
            : `${S.SUCCESS} Successfully cleared existing ${M.PINK}\"IPAs\"${M.GREEN} in ${M.PINK}\"./Dist\".${M.ENDC}\n`
        )
    });

    const IPAS: string[] = await M.get('ls Ipas')
    const IPA_NAME: string = IPAS[0].split('.')[0]
    const IPA_DIR: string = `Ipas/${IPA_NAME}.ipa`;

    await Shell.write(`${S.SUCCESS} Directory of IPA: ${M.PINK}${IPA_DIR}${M.ENDC}\n`);

    await Shell.write(`${S.PENDING}${M.CYAN} Unzipping ${M.PINK}\"${IPA_DIR}\"${M.CYAN} into ${M.PINK}\"./Payload\".${M.ENDC}\r`);
    await Shell.runSilently(`unzip -o ${IPA_DIR} & wait $!`, (errs) => {
        Shell.write(errs
            ? `${S.FAILURE} An error occurred while unzipping ${M.PINK}\"${IPA_DIR}\".${M.ENDC}\n`
            : `${S.SUCCESS} Successfully unzipped ${M.PINK}\"${IPA_DIR}\"${M.GREEN} into ${M.PINK}\"./Payload\".${M.ENDC}\n`
        )
    });

    await D.logDivider();

    const MAIN_PLIST: string = `Payload/Discord.app/Info.plist`;

    await Shell.write(`${S.PENDING}${M.CYAN} Replacing Discord's Name To ${M.PINK}\"Rosiecord\".${M.ENDC}\r`);
    await Shell.runSilently(`plutil -replace CFBundleName -string "Rosiecord" ${MAIN_PLIST} & wait $!`);
    await Shell.runSilently(`plutil -replace CFBundleDisplayName -string "Rosiecord" ${MAIN_PLIST} & wait $!`, (errs) => {
        Shell.write(errs
            ? `${S.FAILURE} An error occurred while Replacing ${M.PINK}\"Discord's Name\".${M.ENDC}\n`
            : `${S.SUCCESS} Successfully Replaced ${M.PINK}\"Discord's Name\"${M.GREEN} to ${M.PINK}\"Rosiecord\".${M.ENDC}\n`
        );
    });

    await Shell.write(`${S.PENDING}${M.CYAN} Patching Discord's URL Scheme To ${M.PINK}\"Add Enmity's URL Handler\".${M.ENDC}\r`);
    await Shell.runSilently(`plutil -insert CFBundleURLTypes.1 -xml "<dict><key>CFBundleURLName</key><string>Enmity</string><key>CFBundleURLSchemes</key><array><string>enmity</string></array></dict>" ${MAIN_PLIST} & wait $!`, (errs) => {
        Shell.write(errs
            ? `${S.FAILURE} An error occurred while Patching ${M.PINK}\"Discord's URL Scheme\".${M.ENDC}\n`
            : `${S.SUCCESS} Successfully Patched ${M.PINK}\"Discord's URL Scheme\"${M.GREEN} to ${M.PINK}\./Add Enmity's URL Handler\".${M.ENDC}\n`
        );
    });

    await Shell.write(`${S.PENDING}${M.CYAN} Removing Discord's ${M.PINK}\"Supported Device Limits\"${M.CYAN}.${M.ENDC}\r`);
    await Shell.runSilently(`plutil -remove UISupportedDevices ${MAIN_PLIST} & wait $!`, (errs) => {
        Shell.write(errs
            ? `${S.FAILURE} An error occurred while removing Discord's ${M.PINK}\"Supported Device Limits\"${M.RED}.${M.ENDC}\n`
            : `${S.SUCCESS} Successfully Removed Discord's ${M.PINK}\"Supported Device Limits\"${M.GREEN}.${M.ENDC}\n`
        );
    });

    await Shell.write(`${S.PENDING}${M.CYAN} Patching ${M.PINK}\"Discord's Icons\" ${M.CYAN} to ${M.PINK}\"Enmity's Icons\"${M.CYAN}.${M.ENDC}\r`);
    await Shell.runSilently(`cp -rf Icons/* Payload/Discord.app/`)
    await Shell.runSilently(`plutil -replace CFBundleIcons -xml "<dict><key>CFBundlePrimaryIcon</key><dict><key>CFBundleIconFiles</key><array><string>EnmityIcon60x60</string></array><key>CFBundleIconName</key><string>EnmityIcon</string></dict></dict>" ${MAIN_PLIST} & wait $!`)
    await Shell.runSilently(`plutil -replace CFBundleIcons~ipad -xml "<dict><key>CFBundlePrimaryIcon</key><dict><key>CFBundleIconFiles</key><array><string>EnmityIcon60x60</string><string>EnmityIcon76x76</string></array><key>CFBundleIconName</key><string>EnmityIcon</string></dict></dict>" ${MAIN_PLIST} & wait $!`, (errs) => {
        Shell.write(errs
             ? `${S.FAILURE} An error occurred while removing Discord's ${M.PINK}\"Supported Device Limits\"${M.RED}.${M.ENDC}\n`
             : `${S.SUCCESS} Successfully Patched ${M.PINK}\"Discord's Icons\"${M.GREEN} to ${M.PINK}\"Enmity's Icons\"${M.GREEN}.${M.ENDC}\n`
        )
    })

    await Shell.write(`${S.PENDING}${M.CYAN} Enabling ${M.PINK}\"UISupportsDocumentBrowser\"${M.CYAN} and ${M.PINK}\"UIFileSharingEnabled\"${M.CYAN}.${M.ENDC}\r`);
    await Shell.run(`plutil -replace UISupportsDocumentBrowser -bool true ${MAIN_PLIST} & wait $!`)
    await Shell.run(`plutil -replace UIFileSharingEnabled -bool true ${MAIN_PLIST} & wait $!`, (errs) => {
        Shell.write(errs
            ? `${S.FAILURE} An error occurred while Enabling ${M.PINK}\"UISupportsDocumentBrowser\"${M.RED} and ${M.PINK}\"UIFileSharingEnabled\"${M.RED}.${M.ENDC}\n`
            : `${S.SUCCESS} Successfully Enabled ${M.PINK}\"UISupportsDocumentBrowser\"${M.GREEN} and ${M.PINK}\"UIFileSharingEnabled\"${M.GREEN}.${M.ENDC}\n`
        )
    });

    await D.logDivider();

    await Init.PackageFlowercord();
    await Init.InitializeAzule();

    await D.logDivider();

    for (let i = 0; i <= 3; i++) {
        await EntryPoint(i);
        await D.logDivider();
        // await new Promise((resolve) => setTimeout(() => resolve(), 2000));
    }

    const END_TIME = Date.now();
    await Shell.write(`${S.SUCCESS} Successfully built ${M.PINK}Rosiecord${M.GREEN} in ${M.CYAN}${(END_TIME-START_TIME)/1000} seconds${M.GREEN}.`)
}

await main();
export {};