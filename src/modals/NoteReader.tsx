import React, { useContext } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppContext } from '../AppContext';
import { useTheme } from '../theme';
import Checkbox from '../components/Checkbox';
import { hapticTap } from '../haptics';

export default function NoteReader() {
  const ctx = useContext(AppContext);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = ctx;

  const idea = state.readerId !== null
    ? state.ideas.find(i => i.id === state.readerId)
    : null;

  if (!idea) return null;

  const due = idea.due ? ctx.dueInfo(idea.due) : null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={ctx.closeReader}
      />

      <View style={[
        styles.sheet,
        {
          backgroundColor: theme.bg,
          paddingTop: insets.top,
        },
      ]}>
        {/* Toolbar */}
        <View style={[styles.toolbar, { borderBottomColor: theme.line }]}>
          <TouchableOpacity style={styles.backBtn} onPress={ctx.closeReader}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke={theme.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={[styles.backText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
              Back
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={ctx.editFromReader}>
            <Text style={[styles.editBtn, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={[styles.title, { fontFamily: theme.fdispFamily, color: theme.ink }]}>
            {idea.title}
          </Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <Text style={[styles.metaDate, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
              {ctx.fmtShort(idea.createdAt)}
            </Text>
            {idea.project && (
              <View style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.chipText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                  {idea.project}
                </Text>
              </View>
            )}
            {due && (
              <View style={[
                styles.chip,
                { backgroundColor: due.overdue ? '#FEE2E2' : theme.accentSoft }
              ]}>
                <Text style={[
                  styles.chipText,
                  { fontFamily: theme.fuiFamily, color: due.overdue ? '#DC2626' : theme.accent }
                ]}>
                  {due.label}
                </Text>
              </View>
            )}
          </View>

          {/* Tags */}
          {idea.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {idea.tags.map(tag => (
                <View key={tag} style={[styles.tagChip, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.tagText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Body */}
          {idea.body ? (
            <Text style={[styles.body, { fontFamily: theme.fuiFamily, color: theme.inkSoft }]}>
              {idea.body}
            </Text>
          ) : null}

          {/* Checklist */}
          {idea.extras.checklist && idea.checklist.length > 0 && (
            <View style={[styles.section, { borderColor: theme.line }]}>
              <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                CHECKLIST
              </Text>
              {idea.checklist.map((item, idx) => (
                <View key={idx} style={styles.checkRow}>
                  <Checkbox
                    checked={item.done}
                    onToggle={() => ctx.toggleChk(idea.id, idx)}
                    accent={theme.accent}
                    line={theme.line}
                    size={20}
                    successOnCheck
                  />
                  <Text style={[
                    styles.checkText,
                    { fontFamily: theme.fuiFamily, color: item.done ? theme.inkFaint : theme.ink },
                    item.done && styles.checkDone,
                  ]}>
                    {item.text}
                  </Text>
                  {!item.done && (
                    <TouchableOpacity
                      onPress={() => { hapticTap(); ctx.setTaskToday(idea.id, idx, !item.today); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={[
                        styles.todayBadge,
                        item.today
                          ? { backgroundColor: theme.accent }
                          : { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.line },
                      ]}
                    >
                      <Text style={[
                        styles.todayText,
                        { fontFamily: theme.fuiFamily, color: item.today ? '#FFF' : theme.inkSoft },
                      ]}>
                        Today
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Links */}
          {idea.extras.links && idea.links.length > 0 && (
            <View style={[styles.section, { borderColor: theme.line }]}>
              <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                LINKS
              </Text>
              {idea.links.map((link, idx) => (
                <View key={idx} style={styles.linkRow}>
                  <Text style={[styles.linkText, { fontFamily: theme.fuiFamily, color: theme.accent }]}>
                    {link.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Sketches */}
          {idea.extras.sketch && idea.sketches.length > 0 && (
            <View style={[styles.section, { borderColor: theme.line }]}>
              <Text style={[styles.sectionLabel, { fontFamily: theme.fuiFamily, color: theme.inkFaint }]}>
                SKETCHES
              </Text>
              <View style={styles.sketchGrid}>
                {idea.sketches.map((uri, idx) => (
                  <Image
                    key={idx}
                    source={{ uri }}
                    style={[styles.sketchImage, { borderColor: theme.line }]}
                    resizeMode="cover"
                  />
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 200,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    ...StyleSheet.absoluteFillObject,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 15,
    fontWeight: '500',
  },
  editBtn: {
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaDate: {
    fontSize: 13,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  section: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  checkText: {
    flex: 1,
    fontSize: 15,
  },
  checkDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  todayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  linkRow: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  sketchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sketchImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
  },
});
