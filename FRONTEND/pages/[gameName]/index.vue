<script setup>
import { fetchGameSet } from '@/api/sets';
const route = useRoute()
const gameSlug = route.params.gameName
const { data: setList } = await useAsyncData('sets', () => fetchGameSet(gameSlug));

const openDialog = ref(false);
const editableSet = ref(null);

const editMode = ref(false);

const autoCompiledNewSet = computed(() => {
    const setExample = setList.value[0];
    return {
        game: setExample.game,
    }
});

async function refreshData() {
    await refreshNuxtData(['sets']);
}

function createNewSet() {
    editableSet.value = autoCompiledNewSet.value;
    openDialog.value = true;
}

function editSet(set) {
    console.log({set});
    
    editableSet.value = {
        id: set.id,
        name: set.name,
        image_url: set.image_url,
        game: set.game,
        code: set.code,
        slug: set.slug,
    };
    openDialog.value = true;
}

definePageMeta({
    middleware: 'auth'
})
</script>
<template>
    <section>
        <Toolbar backButton label="Sets">
            <template #actions>
                <v-btn v-if="editMode" color="error"  @click="editMode = false">
                    <v-icon icon="mdi-pencil-off"></v-icon>
                </v-btn>
                <v-btn v-else color="warning"  @click="editMode = true">
                    <v-icon icon="mdi-pencil"></v-icon>
                </v-btn>
                <v-btn color="green"  @click="createNewSet()">
                    <v-icon icon="mdi-plus"></v-icon>
                </v-btn>
            </template>
        </Toolbar>
        <DialogsHandleSet v-model="openDialog" :set-to-edit="editableSet" @refresh-data="refreshData"/>
        <v-container fluid class="grid grid-cols-2 gap-2 pa-2 lg:pa-4 lg:grid-cols-8 lg:gap-4">
            <CardSet
                v-for="set in setList"
                :key="set.id"
                :set="set"
                :edit-mode="editMode"
                @edit-set="editSet(set)"
            />
        </v-container>
    </section>
</template>