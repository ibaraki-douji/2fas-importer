export class Config {
    public static readonly INTERVAL = process.env.INTERVAL ? parseInt(process.env.INTERVAL) : 15; // in minutes

    public static readonly SOURCE = process.env.SOURCE ? process.env.SOURCE : 'https://api2.2fas.com';

    public static readonly DESTINATION = process.env.DESTINATION;

    public static readonly DESTINATION_ADMIN = process.env.DESTINATION_ADMIN;

    static {
        if (!Config.DESTINATION) {
            throw new Error('DESTINATION is not set');
        }

        if (!Config.DESTINATION_ADMIN) {
            throw new Error('DESTINATION_ADMIN is not set');
        }
    }
}