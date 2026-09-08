class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.states = {};
    }

    register(plugin) {
        this.plugins.set(plugin.id, plugin);
    }

    async initAll() {
        this.states = await pywebview.api.get_modules_state();

        for (const [id, plugin] of this.plugins.entries()) {
            if (plugin.isCore) {
                plugin.mount();
            } else {
                const isEnabled = this.states[`module_${id}`] ?? true;
                if (isEnabled) {
                    plugin.mount();
                }
            }
        }
    }

    async setEnabled(pluginId, enabled) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || plugin.isCore) return;

        this.states[`module_${pluginId}`] = enabled;
        await pywebview.api.toggle_module(`module_${pluginId}`, enabled);

        if (enabled) {
            plugin.mount();
        } else {
            plugin.unmount();
        }
    }

    getAllPlugins() {
        return Array.from(this.plugins.values()).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            isCore: p.isCore,
            enabled: p.isCore ? true : (this.states[`module_${p.id}`] ?? true)
        }));
    }
}

window.plugins = new PluginManager();
