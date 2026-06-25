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
import Svg, { Path } from 'react-native-svg';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import IdeaCard from '../components/IdeaCard';
import type { Idea } from '../types';

export default function Ideas() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const allActive = ctx.active();
  const archived = state.ideas.filter(i => i.archived);

  // All unique tags
  const allTags = Array.from(
    new Set(allActive.flatMap(i => i.tags))
  ).sort();

  // All unique projects
  const allProjects = Array.from(
    new Set(allActive.filter(i => i.project).map(i => i.project as string))
  ).sort();

  // Filtering & sorting for the All tab (the search box drives its own list below).
  const getFilteredSorted = (): Idea[] => {
    let list = allActive;
    if (state.ideasFilter) {
      list = list.filter(i => i.tags.includes(state.ideasFilter!));
    }
    switch (state.ideasSort) {
      case 'oldest':
        return [...list].sort((a, b) => a.createdAt - b.createdAt);
      case 'due':
        return [...list].sort((a, b) => {
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return a.due - b.due;
        });
      default:
        return [...list].sort((a, b) => b.createdAt - a.createdAt);
    }
  };

  const getBrowseList = (): Idea[] => {
    if (!state.browseKey) return [];
    if (state.browseKey === 'archived') return archived;
    if (state.browseKey.startsWith('proj:')) {
      const name = state.browseKey.slice(5);
      return allActive.filter(i => i.project === name);
    }
    if (state.browseKey.startsWith('tag:')) {
      const tag = state.browseKey.slice(4);
      return allActive.filter(i => i.tags.includes(tag));
    }
    return [];
  };

  const getBrowseTitle = (): string => {
    if (!state.browseKey) return '';
    if (state.browseKey === 'archived') return 'Archived';
    if (state.browseKey.startsWith('proj:')) return state.browseKey.slice(5);
    if (state.browseKey.startsWith('tag:')) return `#${state.browseKey.slice(4)}`;
    return '';
  };

  const sortLabel = {
    recent: 'Recent first',
    oldest: 'Oldest first',
    due: 'By due date',
  }[state.ideasSort];

  const isSearching = state.search.trim().length > 0;
  const isBrowsing = !!state.browseKey && !isSearching;

  const filteredList = getFilteredSorted();
  const browseList = getBrowseList();
  const searchList = allActive.filter(i => {
    const q = state.search.toLowerCase();
    return (
      i.title.toLowerCase().includes(q) ||
      i.body.toLowerCase().includes(q) ||
      i.tags.some(t => t.includes(q))
    );
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        {!isBrowsing ? (
          <Text style={[styles.title, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
            Ideas
          </Text>
        ) : (
          <View style={styles.browseHeader}>
            <TouchableOpacity onPress={ctx.clearBrowse} style={styles.backBtn}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path d="M15 18l-6-6 6-6" stroke={theme.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={[styles.backText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.title, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
              {getBrowseTitle()}
            </Text>
          </View>
        )}

        {/* Search box */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              stroke={theme.inkFaint}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
          </Svg>
          <TextInput
            style={[styles.searchInput, { fontFamily: theme.fuiFamily, color: theme.ink }]}
            placeholder="Search ideas…"
            placeholderTextColor={theme.inkFaint}
            value={state.search}
            onChangeText={text => ctx.dispatch({ type: 'SET_SEARCH', text })}
          />
          {state.search.length > 0 && (
            <TouchableOpacity onPress={() => ctx.dispatch({ type: 'SET_SEARCH', text: '' })}>
              <Text style={{ color: theme.inkFaint, fontSize: 16, paddingHorizontal: 4 }}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Browse mode */}
        {isBrowsing && (
          <>
            <Text style={[styles.countLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
              {browseList.length} idea{browseList.length !== 1 ? 's' : ''}
            </Text>
            {browseList.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onPress={() => ctx.openReader(idea.id)}
                onArchive={() => ctx.archiveIdea(idea.id)}
              />
            ))}
          </>
        )}

        {/* Search mode */}
        {!isBrowsing && isSearching && (
          <>
            <Text style={[styles.countLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
              {searchList.length} result{searchList.length !== 1 ? 's' : ''}
            </Text>
            {searchList.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onPress={() => ctx.openReader(idea.id)}
                onArchive={() => ctx.archiveIdea(idea.id)}
              />
            ))}
          </>
        )}

        {/* Normal mode */}
        {!isBrowsing && !isSearching && (
          <>
            {/* Tab toggle */}
            <View style={[styles.tabToggle, { backgroundColor: theme.surface, borderColor: theme.line }]}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  state.ideasView === 'all' && { backgroundColor: theme.accent },
                ]}
                onPress={() => ctx.setIdeasView('all')}
              >
                <Text style={[
                  styles.tabBtnText,
                  { fontFamily: theme.fuiFamily },
                  state.ideasView === 'all' ? { color: '#FFF' } : { color: theme.inkSoft },
                ]}>
                  All ideas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  state.ideasView === 'folders' && { backgroundColor: theme.accent },
                ]}
                onPress={() => ctx.setIdeasView('folders')}
              >
                <Text style={[
                  styles.tabBtnText,
                  { fontFamily: theme.fuiFamily },
                  state.ideasView === 'folders' ? { color: '#FFF' } : { color: theme.inkSoft },
                ]}>
                  Folders
                </Text>
              </TouchableOpacity>
            </View>

            {/* All ideas tab */}
            {state.ideasView === 'all' && (
              <>
                <View style={styles.listControls}>
                  <TouchableOpacity onPress={ctx.cycleSort}>
                    <Text style={[styles.sortBtn, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                      {sortLabel} ↕
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.countLabel2, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                    {filteredList.length} ideas
                  </Text>
                </View>

                {/* Filter chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterScroll}
                  contentContainerStyle={styles.filterContent}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      { borderColor: theme.line, backgroundColor: !state.ideasFilter ? theme.accent : theme.surface },
                    ]}
                    onPress={() => ctx.setIdeasFilter(null)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { fontFamily: theme.fuiFamily, color: !state.ideasFilter ? '#FFF' : theme.inkSoft },
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {allTags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.filterChip,
                        {
                          borderColor: theme.line,
                          backgroundColor: state.ideasFilter === tag ? theme.accent : theme.surface,
                        },
                      ]}
                      onPress={() => ctx.setIdeasFilter(state.ideasFilter === tag ? null : tag)}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { fontFamily: theme.fuiFamily, color: state.ideasFilter === tag ? '#FFF' : theme.inkSoft },
                      ]}>
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {filteredList.map(idea => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    onPress={() => ctx.openReader(idea.id)}
                    onArchive={() => ctx.archiveIdea(idea.id)}
                  />
                ))}
              </>
            )}

            {/* Folders tab */}
            {state.ideasView === 'folders' && (
              <>
                {/* Projects */}
                <Text style={[styles.folderSection, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                  PROJECTS
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.projectScroll}
                >
                  {allProjects.map(proj => {
                    const count = allActive.filter(i => i.project === proj).length;
                    return (
                      <TouchableOpacity
                        key={proj}
                        style={[styles.projectCard, { backgroundColor: theme.surface, borderColor: theme.line }]}
                        onPress={() => ctx.openBrowse(`proj:${proj}`)}
                        onLongPress={() => ctx.openManage('project', proj)}
                        activeOpacity={0.8}
                      >
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                            stroke={theme.accent}
                            strokeWidth={1.8}
                          />
                        </Svg>
                        <Text style={[styles.projectName, { fontFamily: theme.fuiFamily, color: theme.ink }]} numberOfLines={2}>
                          {proj}
                        </Text>
                        <Text style={[styles.projectCount, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                          {count} idea{count !== 1 ? 's' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.projectCard, styles.newProjectCard, { backgroundColor: theme.canvas, borderColor: theme.line }]}
                    onPress={ctx.startNewProject}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.newProjectText, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
                      + New project
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Tags */}
                <Text style={[styles.folderSection, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                  TAGS
                </Text>
                {allTags.map(tag => {
                  const count = allActive.filter(i => i.tags.includes(tag)).length;
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagRow, { borderBottomColor: theme.line }]}
                      onPress={() => ctx.openBrowse(`tag:${tag}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tagName, { fontFamily: theme.fuiFamily, color: theme.ink }]}>
                        #{tag}
                      </Text>
                      <Text style={[styles.tagCount, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                        {count}
                      </Text>
                      <TouchableOpacity
                        onPress={() => ctx.openManage('tag', tag)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={[styles.menuDots, { color: theme.inkFaint }]}>⋯</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}

                {/* Archived */}
                {archived.length > 0 && (
                  <TouchableOpacity
                    style={[styles.tagRow, { borderBottomColor: theme.line }]}
                    onPress={() => ctx.openBrowse('archived')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tagName, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
                      Archived
                    </Text>
                    <Text style={[styles.tagCount, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                      {archived.length}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    gap: 14,
  },
  title: {
    fontSize: 30,
  },
  browseHeader: {
    gap: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  countLabel: {
    fontSize: 13,
  },
  countLabel2: {
    fontSize: 13,
  },
  tabToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sortBtn: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterScroll: {
    marginHorizontal: -16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  folderSection: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  projectScroll: {
    gap: 10,
    paddingRight: 16,
  },
  projectCard: {
    width: 152,
    borderRadius: 15,
    borderWidth: 1,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  newProjectCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  projectCount: {
    fontSize: 12,
  },
  newProjectText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tagName: {
    flex: 1,
    fontSize: 15,
  },
  tagCount: {
    fontSize: 13,
    marginRight: 12,
  },
  menuDots: {
    fontSize: 18,
    paddingHorizontal: 4,
  },
});
