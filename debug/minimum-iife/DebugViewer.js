
class DebugViewer extends maprayui.StandardUIViewer {
    constructor(container, Option = {}) {
        // Set Access Token
        var accessToken = "<your access token here>";

        super(container, accessToken, {
            debug_stats: new mapray.DebugStats(),
        });

        const init_camera = {
            longitude: 139.73685,
            latitude: 35.680,
            height: 1000
        };
        const lookat_position = {
            longitude: 139.69685,
            latitude: 35.689777,
            height: 0
        };
        this.setCameraPosition(init_camera);
        this.setLookAtPosition(lookat_position);
    }
}
