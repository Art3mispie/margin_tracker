import React, { useContext } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import { disp, ui } from '../fonts';
import Icon from '../components/Icon';
import Card from '../components/Card';
import IdeaCard from '../components/IdeaCard';
import type { Idea } from '../types';

export default function Ideas() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const tk = theme.key;
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const allActive = ctx.active();
  const archived = state.ideas.filter(i => i.archived);

  // Project / tag counts, ordered by frequency (matches the design).
  const projMap: Record<string, number> = {};
  const tagMap: Record<string, number> = {};
  allActive.forEach(i => {
    if (i.project) projMap[i.project] = (projMap[i.project] || 0) + 1;
    i.tags.forEach(t => (tagMap[t] = (tagMap[t] || 0) + 1));
  });
  const projects = Object.keys(projMap).sort((a, b) => projMap[b] - projMap[a]);
  const tags = Object.keys(tagMap).sort((a, b) => tagMap[b] - tagMap[a]);

  const sortLabel = state.ideasSort === 'recent' ? 'Newest' : state.ideasSort === 'oldest' ? 'Oldest' : 'Due date';

  const allFiltered = allActive.filter(i => !state.ideasFilter || i.tags.includes(state.ideasFilter));
  const allSorted = [...allFiltered].sort((a, b) => {
    if (state.ideasSort === 'oldest') return a.createdAt - b.createdAt;
    if (state.ideasSort === 'due') {
      if (a.due && b.due) return a.due - b.due;
      if (a.due) return -1;
      if (b.due) return 1;
      return b.createdAt - a.createdAt;
    }
    return b.createdAt - a.createdAt;
  });

  const q = state.search.trim().toLowerCase();
  const searchActive = q.length > 0;
  const searchResults = searchActive
    ? [...allActive]
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter(
          i =>
            i.title.toLowerCase().includes(q) ||
            i.body.toLowerCase().includes(q) ||
            (i.project || '').toLowerCase().includes(q) ||
            i.tags.some(t => t.toLowerCase().includes(q))
        )
    : [];

  const isBrowsing = !!state.browseKey && !searchActive;
  let browseTitle = '';
  let browseList: Idea[] = [];
  let browseManageable = false;
  let browseKind: 'project' | 'tag' = 'project';
  let browseName = '';
  if (state.browseKey) {
    const sortedActive = [...allActive].sort((a, b) => b.createdAt - a.createdAt);
    if (state.browseKey === 'archived') {
      browseTitle = 'Archived';
      browseList = [...archived].sort((a, b) => b.createdAt - a.createdAt);
    } else if (state.browseKey.startsWith('proj:')) {
      browseName = state.browseKey.slice(5);
      browseTitle = browseName;
      browseManageable = true;
      browseKind = 'project';
      browseList = sortedActive.filter(i => i.project === browseName);
    } else if (state.browseKey.startsWith('tag:')) {
      browseName = state.browseKey.slice(4);
      browseTitle = `#${browseName}`;
      browseManageable = true;
      browseKind = 'tag';
      browseList = sortedActive.filter(i => i.tags.includes(browseName));
    }
  }

  const countWord = (n: number) => `${n} idea${n === 1 ? '' : 's'}`;

  const renderCards = (list: Idea[]) =>
    list.map(idea => (
      <IdeaCard
        key={idea.id}
        idea={idea}
        onPress={() => ctx.openReader(idea.id)}
        onArchive={() => ctx.archiveIdea(idea.id)}
      />
    ));

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isBrowsing && (
          <Text style={[styles.title, { fontFamily: disp(tk), color: theme.ink }]}>Ideas</Text>
        )}

        {/* Search */}
        <Card radius={13} style={styles.searchBox}>
          <Icon name="search" size={17} color={theme.inkFaint} strokeWidth={1.8} />
          <TextInput
            style={[styles.searchInput, { fontFamily: ui(), color: theme.ink }]}
            placeholder="Search ideas, tags, projects"
            placeholderTextColor={theme.inkFaint}
            value={state.search}
            onChangeText={text => ctx.dispatch({ type: 'SET_SEARCH', text })}
          />
          {state.search.length > 0 && (
            <TouchableOpacity onPress={() => ctx.dispatch({ type: 'SET_SEARCH', text: '' })} hitSlop={8}>
              <Text style={{ color: theme.inkFaint, fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Search results */}
        {searchActive && (
          <View style={{ marginTop: 18 }}>
            <Text style={[styles.dim, { fontFamily: ui(500), color: theme.inkFaint, marginBottom: 12 }]}>
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
            </Text>
            {renderCards(searchResults)}
          </View>
        )}

        {/* Browse a project / tag / archive */}
        {isBrowsing && (
          <View style={{ marginTop: 18 }}>
            <View style={styles.browseTop}>
              <TouchableOpacity style={styles.backBtn} onPress={ctx.clearBrowse}>
                <Icon name="chevronLeft" size={16} color={theme.inkSoft} strokeWidth={1.9} />
                <Text style={[styles.backText, { fontFamily: ui(600), color: theme.inkSoft }]}>Back</Text>
              </TouchableOpacity>
              {browseManageable && (
                <TouchableOpacity onPress={() => ctx.openManage(browseKind, browseName)} hitSlop={8}>
                  <Icon name="dots" size={20} color={theme.inkSoft} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.browseTitle, { fontFamily: disp(tk), color: theme.ink }]}>{browseTitle}</Text>
            <Text style={[styles.dim, { fontFamily: ui(), color: theme.inkFaint, marginTop: 2 }]}>
              {countWord(browseList.length)}
            </Text>
            <View style={{ marginTop: 14 }}>{renderCards(browseList)}</View>
          </View>
        )}

        {/* Tabs + content */}
        {!isBrowsing && !searchActive && (
          <>
            <View style={[styles.tabs, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              {(['all', 'folders'] as const).map(v => {
                const active = state.ideasView === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[styles.tabBtn, active && { backgroundColor: theme.accent }]}
                    onPress={() => ctx.setIdeasView(v)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabText, { fontFamily: ui(600), color: active ? '#fff' : theme.inkSoft }]}>
                      {v === 'all' ? 'All ideas' : 'Folders'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {state.ideasView === 'all' ? (
              <>
                <View style={styles.allControls}>
                  <TouchableOpacity
                    style={[styles.sortBtn, { borderColor: theme.line, backgroundColor: theme.surface }]}
                    onPress={ctx.cycleSort}
                    activeOpacity={0.8}
                  >
                    <Icon name="sliders" size={15} color={theme.inkSoft} strokeWidth={1.8} />
                    <Text style={[styles.sortText, { fontFamily: ui(600), color: theme.ink }]}>{sortLabel}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.dim, { fontFamily: ui(), color: theme.inkFaint }]}>
                    {countWord(allFiltered.length)}
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  contentContainerStyle={styles.chipScrollContent}
                >
                  {[{ tag: null as string | null, label: 'All' }, ...tags.map(t => ({ tag: t, label: `#${t}` }))].map(
                    chip => {
                      const active = state.ideasFilter === chip.tag;
                      return (
                        <TouchableOpacity
                          key={chip.label}
                          style={[
                            styles.chip,
                            { borderColor: active ? theme.accent : theme.line, backgroundColor: active ? theme.accent : theme.surface },
                          ]}
                          onPress={() => ctx.setIdeasFilter(chip.tag)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, { fontFamily: ui(600), color: active ? '#fff' : theme.inkSoft }]}>
                            {chip.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>

                <View style={{ marginTop: 14 }}>{renderCards(allSorted)}</View>
              </>
            ) : (
              <>
                {/* Projects */}
                <View style={styles.folderHead}>
                  <Text style={[styles.folderLabel, { fontFamily: ui(600), color: theme.inkSoft }]}>PROJECTS</Text>
                  <TouchableOpacity style={styles.newBtn} onPress={ctx.startNewProject}>
                    <Icon name="plus" size={14} color={theme.accent} strokeWidth={2.2} />
                    <Text style={[styles.newText, { fontFamily: ui(600), color: theme.accent }]}>New</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  contentContainerStyle={[styles.chipScrollContent, { gap: 11 }]}
                >
                  {projects.map(name => (
                    <Card key={name} radius={16} style={styles.projectCard}>
                      <View style={styles.projectTop}>
                        <View style={[styles.projectIcon, { backgroundColor: theme.accentSoft }]}>
                          <Icon name="folder" size={16} color={theme.accent} strokeWidth={1.7} />
                        </View>
                        <TouchableOpacity onPress={() => ctx.openManage('project', name)} hitSlop={8}>
                          <Icon name="dots" size={18} color={theme.inkFaint} />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => ctx.openBrowse(`proj:${name}`)} activeOpacity={0.8}>
                        <Text style={[styles.projectName, { fontFamily: disp(tk), color: theme.ink }]} numberOfLines={2}>
                          {name}
                        </Text>
                        <Text style={[styles.projectCount, { fontFamily: ui(), color: theme.inkFaint }]}>
                          {countWord(projMap[name])}
                        </Text>
                      </TouchableOpacity>
                    </Card>
                  ))}
                  {projects.length === 0 && (
                    <Text style={[styles.dim, { fontFamily: ui(), color: theme.inkFaint, paddingVertical: 8 }]}>
                      No projects yet.
                    </Text>
                  )}
                </ScrollView>

                {/* Tags */}
                <Text style={[styles.folderLabel, { fontFamily: ui(600), color: theme.inkSoft, marginTop: 24 }]}>TAGS</Text>
                <Text style={[styles.dim, { fontFamily: ui(), color: theme.inkFaint, marginTop: 3 }]}>
                  Add tags from any idea · tap ⋯ to rename or remove
                </Text>
                <Card radius={16} clip style={{ marginTop: 10 }}>
                  {tags.map((tag, idx) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagRow, idx > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}
                      onPress={() => ctx.openBrowse(`tag:${tag}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tagHash, { fontFamily: disp(tk), color: theme.accent }]}>#</Text>
                      <Text style={[styles.tagName, { fontFamily: ui(500), color: theme.ink }]}>{tag}</Text>
                      <Text style={[styles.tagCount, { fontFamily: ui(), color: theme.inkFaint }]}>{tagMap[tag]}</Text>
                      <TouchableOpacity onPress={() => ctx.openManage('tag', tag)} hitSlop={8} style={{ padding: 6 }}>
                        <Icon name="dots" size={18} color={theme.inkFaint} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                  {tags.length === 0 && (
                    <Text style={[styles.dim, { fontFamily: ui(), color: theme.inkFaint, padding: 16 }]}>
                      No tags yet.
                    </Text>
                  )}
                </Card>

                {/* Archived */}
                {archived.length > 0 && (
                  <TouchableOpacity activeOpacity={0.8} onPress={() => ctx.openBrowse('archived')} style={{ marginTop: 16 }}>
                    <Card radius={14} style={styles.archivedRow}>
                      <Icon name="archive" size={17} color={theme.inkSoft} strokeWidth={1.7} />
                      <Text style={[styles.archivedText, { fontFamily: ui(500), color: theme.ink }]}>Archived</Text>
                      <Text style={[styles.dim, { fontFamily: ui(), color: theme.inkFaint }]}>{archived.length}</Text>
                    </Card>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22 },
  title: { fontSize: 30, letterSpacing: -0.2, marginBottom: 16 },

  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, fontSize: 14.5, padding: 0 },

  dim: { fontSize: 12.5 },

  browseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 13.5 },
  browseTitle: { fontSize: 23, marginTop: 12 },

  tabs: { flexDirection: 'row', gap: 5, borderRadius: 12, borderWidth: 1, padding: 4, marginTop: 14 },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  tabText: { fontSize: 13.5 },

  allControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortText: { fontSize: 13 },

  chipScroll: { marginHorizontal: -22, marginTop: 12 },
  chipScrollContent: { paddingHorizontal: 22, gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7 },
  chipText: { fontSize: 13 },

  folderHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 },
  folderLabel: { fontSize: 13, letterSpacing: 0.5 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newText: { fontSize: 13 },

  projectCard: { width: 152, padding: 16 },
  projectTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  projectIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  projectName: { fontSize: 16, lineHeight: 20, marginTop: 12 },
  projectCount: { fontSize: 12.5, marginTop: 4 },

  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingLeft: 16, paddingRight: 10 },
  tagHash: { fontSize: 16 },
  tagName: { flex: 1, fontSize: 15 },
  tagCount: { fontSize: 13 },

  archivedRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 14 },
  archivedText: { flex: 1, fontSize: 14.5 },
});
