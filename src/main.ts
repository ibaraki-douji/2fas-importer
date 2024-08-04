import Console, { Color } from "@ibaraki-douji/console"
import { Config } from "./config"


Console.colors.info = Color.CYAN;


( async () => {

    Console.log(`
${Color.YELLOW}        ▄█  ▀█████████▄     ▄████████    ▄████████    ▄████████    ▄█   ▄█▄  ▄█  
${Color.YELLOW}        ███    ███    ███   ███    ███   ███    ███   ███    ███   ███ ▄███▀ ███  
${Color.YELLOW}        ███▌   ███    ███   ███    ███   ███    ███   ███    ███   ███▐██▀   ███▌ 
${Color.YELLOW}        ███▌  ▄███▄▄▄██▀    ███    ███  ▄███▄▄▄▄██▀   ███    ███  ▄█████▀    ███▌ 
${Color.YELLOW}        ███▌ ▀▀███▀▀▀██▄  ▀███████████  ▀█████████▄ ▀███████████ ▀▀█████▄    ███▌ 
${Color.YELLOW}        ███    ███    ██▄   ███    ███   ███    ███   ███    ███   ███▐██▄   ███  
${Color.YELLOW}        ███    ███    ███   ███    ███   ███    ███   ███    ███   ███ ▀███▄ ███  
${Color.YELLOW}        █▀   ▄█████████▀    ███    █▀    ███    ███   ███    █▀    ███   ▀█▀ █▀   
${Color.YELLOW}                                                                   ▀              
${Color.RED}                                   2FAS Server Importer

    `);
    

    while (true) {
        await loop();

        await new Promise( resolve => setTimeout(resolve, Config.INTERVAL * 60 * 1000));
    }

    

})()

async function loop() {

    Console.info(`${Color.GREEN}Starting import...`);

    try {
        const accessSource = await fetch(`${Config.SOURCE}/health`);
        const accessSourceJson = await accessSource.text();
        if (accessSourceJson !== '{}' || accessSource.status !== 200) {
            throw new Error('Source is not available');
        }
    } catch (e) {
        Console.error(`${Color.RED}Source is not available`);
        return;
    }

    try {
        const accessDestination = await fetch(`${Config.DESTINATION}/health`);
        const accessDestinationJson = await accessDestination.text();
        if (accessDestinationJson !== '{}' || accessDestination.status !== 200) {
            throw new Error('Destination is not available');
        }
    } catch (e) {
        Console.error(`${Color.RED}Destination is not available`);
        return;
    }

    // m = method | a = action | d = destination | s = source
    const endpoints = [
        {
            ref: 'notifications',
            s: "/mobile/notifications",
            sm: "GET",
            sa: "all",
            d: "/mobile/notifications",
            dm: "POST",
            da: "one",
            checker: (source: any, destination: any) => {
                return source.message == destination.message
                && source.platform == destination.platform
                && source.version == destination.version
                && source.icon == destination.icon
                && source.link == destination.link;
            },
            map: async (source: any) => {
                return {
                    icon: source.icon,
                    link: source.link,
                    message: source.message,
                    platform: source.platform,
                    version: source.version
                }
            },
            addon: async (datas: {source: any, mapped: any, created: any}[]) => {
                const publish = async (id: string) => {
                    const response = await fetch(`${Config.DESTINATION_ADMIN}/mobile/notifications/${id}/commands/publish`, {
                        method: 'POST'
                    });
                    return await response.json();
                }

                for (const data of datas) {
                    if (data.source.published_at == "") continue;

                    const publishSource = new Date(data.source.published_at);

                    if (publishSource.getTime() > Date.now() - 86400000) {
                        await publish(data.created.id);
                        Console.log(`${Console.colors.info}Published notification ${data.source.message}`, {initialTab: 2});
                    }
                }
            }
        },
        {
            ref: 'icons',
            s: '/mobile/icons',
            sm: 'GET',
            sa: 'all',
            d: '/mobile/icons',
            dm: 'POST',
            da: 'one',
            checker: (source: any, destination: any) => {
                return source.name == destination.name
                && source.type == destination.type;
            },
            map: async (source: any) => {

                const icon = await fetch(`${source.url}`);
                const iconRaw = await icon.blob();

                return {
                    name: source.name,
                    type: source.type,
                    icon: Buffer.from(await iconRaw.arrayBuffer()).toString('base64')
                }
            },
            addon: async (datas: {source: any, mapped: any, created: any}[]) => {}
        },
        {
            ref: 'iconsCollections',
            s: '/mobile/icons/collections',
            sm: 'GET',
            sa: 'all',
            d: '/mobile/icons/collections',
            dm: 'POST',
            da: 'one',
            checker: (source: any, destination: any) => {
                return source.name == destination.name
                && source.description == destination.description;
            },
            map: async (source: any) => {
                const destIcons = source.icons.map((icon: any) => {
                    return getDestIdFromSourceId(icon, 'icons', endpoints[1].checker);
                });

                return {
                    name: source.name,
                    description: source.description,
                    icons: destIcons
                }
            },
            addon: async (datas: {source: any, mapped: any, created: any}[]) => {}
        },
        {
            ref: 'webServices',
            s: '/mobile/web_services',
            sm: 'GET',
            sa: 'all',
            d: '/mobile/web_services',
            dm: 'POST',
            da: 'one',
            checker: (source: any, destination: any) => {
                return source.name == destination.name
                && source.description == destination.description;
            },
            map: async (source: any) => {

                const destCollections = source.icons_collections.map((collection: any) => {
                    return getDestIdFromSourceId(collection, 'iconsCollections', endpoints[2].checker);
                });

                return {
                    name: source.name,
                    description: source.description,
                    issuers: source.issuers,
                    tags: source.tags,
                    match_rules: source.match_rules,
                    icons_collections: destCollections
                }
            },
            addon: async (datas: {source: any, mapped: any, created: any}[]) => {}
        }
    ];

    for (const endpoint of endpoints) {
        
        Console.info(`Importing endpoint ${endpoint.s}`);
        
        await importEndpoint(endpoint);
    }


    Console.success(`Import finished.`);
    
}

const refs = {
    notifications: {
        source: [],
        destination: []
    },
    icons: {
        source: [],
        destination: []
    },
    iconsCollections: {
        source: [],
        destination: []
    },
    webServices: {
        source: [],
        destination: []
    }
};

function getDestIdFromSourceId(sourceId: string, ref: string, checker: (source: any, destination: any) => boolean) {
    const source = refs[ref].source.find((source: any) => source.id == sourceId);
    const destination = refs[ref].destination.find((destination: any) => checker(source, destination));
    return destination.id;
}

async function importEndpoint(endpoint: any) {

    const MA: {
        s: {
            [key: string]: {
                [key: string]: (source: string) => Promise<any>
            }
        },
        d: {
            [key: string]: {
                [key: string]: (destination: string, data: any) => Promise<any>
            }
        }
    } = {
        s: {
            GET: {
                all: async (source: string) => {
                    const response = await fetch(`${source}`);
                    return await response.json();
                }
            },
        },
        d: {
            POST: {
                one: async (destination: string, data: any) => {
                    const response = await fetch(`${destination}`, {
                        method: 'POST',
                        body: JSON.stringify(data),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    return await response.json();
                }
            }
        }
    };

    Console.log(`${Console.colors.info}Processing endpoint ${endpoint.s}`, {initialTab: 2});

    const sourceData = await MA.s[endpoint.sm][endpoint.sa](Config.SOURCE + endpoint.s);
    const destinationData = await MA.s[endpoint.sm][endpoint.sa](Config.DESTINATION + endpoint.d);

    refs[endpoint.ref].source = sourceData;
    refs[endpoint.ref].destination = destinationData;

    // Compare sourceData and destinationData

    const dataToImport = sourceData.filter((source: any) => {
        return !destinationData.find((destination: any) => {
            return endpoint.checker(source, destination);
        });
    });

    Console.log(`${Console.colors.info}Data to import: ${dataToImport.length}`, {initialTab: 2});

    const mappedData = [];

    for (const data of dataToImport) {
        mappedData.push(await endpoint.map(data));
    }

    const sourceWithMappedData = mappedData.map((mapped: any, index: number) => {
        return {
            source: dataToImport[index],
            mapped: mapped,
            created: undefined
        }
    });

    for (const data of sourceWithMappedData) {
        data.created = await MA.d[endpoint.dm][endpoint.da](Config.DESTINATION_ADMIN + endpoint.d, data.mapped);
        refs[endpoint.ref].destination.push(data.created);
    }

    await endpoint.addon(sourceWithMappedData);

    Console.log(`${Console.colors.success}Endpoint ${endpoint.s} processed`, {initialTab: 2});

}