import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Alert, Dimensions, Modal, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';

const { width, height } = Dimensions.get('window');

const DashboardModal = ({ visible, onClose, onSaveDrawing }) => {
  const viewShotRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState('#1E90FF');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('pen');
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const currentPathData = useRef('');
  const currentPathColor = useRef('#1E90FF');
  const currentPathWidth = useRef(3);
  
  // Refs para valores atuais (para evitar closure stale)
  const selectedColorRef = useRef(selectedColor);
  const brushSizeRef = useRef(brushSize);
  const toolRef = useRef(tool);
  
  // Atualizar refs quando os valores mudarem
  React.useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);
  
  React.useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  
  React.useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  const colors = [
    '#1E90FF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
    '#F38181', '#AA96DA', '#FCBAD3', '#FFFFFF', '#000000',
  ];

  const brushSizes = [2, 3, 5, 8, 12];

  // PanResponder para capturar toques e desenhar
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pathColor = toolRef.current === 'eraser' ? '#1e1e1e' : selectedColorRef.current;
        const pathWidth = toolRef.current === 'eraser' ? brushSizeRef.current * 3 : brushSizeRef.current;
        
        // Começar novo path
        currentPathData.current = `M${locationX},${locationY}`;
        currentPathColor.current = pathColor;
        currentPathWidth.current = pathWidth;
        setCurrentPath(currentPathData.current);
        console.log('Iniciando novo path em', locationX, locationY);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPathData.current += ` L${locationX},${locationY}`;
        setCurrentPath(currentPathData.current);
      },
      onPanResponderRelease: () => {
        if (currentPathData.current) {
          const newPath = {
            path: currentPathData.current,
            color: currentPathColor.current,
            width: currentPathWidth.current,
          };
          console.log('Adicionando novo path:', newPath);
          setPaths((prevPaths) => {
            const updated = [...prevPaths, newPath];
            console.log('Total de paths agora:', updated.length);
            return updated;
          });
          currentPathData.current = '';
          setCurrentPath('');
        }
      },
    })
  ).current;

  const handleClear = () => {
    Alert.alert(
      'Limpar Desenho',
      'Tem certeza que deseja limpar todo o desenho?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            setPaths([]);
            setCurrentPath('');
            currentPathData.current = '';
          },
        },
      ]
    );
  };

  const handleUndo = () => {
    if (paths.length > 0) {
      const newPaths = [...paths];
      newPaths.pop();
      setPaths(newPaths);
    }
  };

  const handleSave = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        console.log('Desenho salvo:', uri);
        onSaveDrawing(uri);
        // Limpar após salvar
        setPaths([]);
        setCurrentPath('');
        currentPathData.current = '';
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar desenho:', error);
      Alert.alert('Erro', 'Não foi possível salvar o desenho');
    }
  };
  
  // Debug: mostrar quantidade de paths
  console.log('Renderizando com', paths.length, 'paths');

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Dashboard - Esboço</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Ionicons name="checkmark" size={28} color="#4ECDC4" />
          </TouchableOpacity>
        </View>

        {/* Canvas Area */}
        <ViewShot ref={viewShotRef} style={styles.canvasContainer}>
          <View
            style={styles.canvas}
            {...panResponder.panHandlers}
          >
            <Svg height={height - 250} width={width - 40}>
              {paths.map((pathData, index) => (
                <Path
                  key={`path-${index}`}
                  d={pathData.path}
                  stroke={pathData.color}
                  strokeWidth={pathData.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentPath && (
                <Path
                  d={currentPath}
                  stroke={currentPathColor.current}
                  strokeWidth={currentPathWidth.current}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </Svg>
          </View>
        </ViewShot>

        {/* Tools Section */}
        <View style={styles.toolsContainer}>
          {/* Color Picker */}
          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>Cores</Text>
            <View style={styles.colorPicker}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColorButton,
                    color === '#FFFFFF' && styles.whiteColorBorder,
                  ]}
                  onPress={() => {
                    setSelectedColor(color);
                    setTool('pen');
                  }}
                />
              ))}
            </View>
          </View>

          {/* Brush Size */}
          <View style={styles.toolSection}>
            <Text style={styles.toolLabel}>Espessura</Text>
            <View style={styles.brushSizeContainer}>
              {brushSizes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.brushSizeButton,
                    brushSize === size && styles.selectedBrushSize,
                  ]}
                  onPress={() => setBrushSize(size)}
                >
                  <View
                    style={[
                      styles.brushSizeIndicator,
                      { width: size * 2, height: size * 2, borderRadius: size },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.toolButton, tool === 'pen' && styles.activeToolButton]}
              onPress={() => setTool('pen')}
            >
              <Ionicons name="brush" size={24} color={tool === 'pen' ? '#1E90FF' : '#fff'} />
              <Text style={[styles.toolButtonText, tool === 'pen' && styles.activeToolText]}>
                Caneta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, tool === 'eraser' && styles.activeToolButton]}
              onPress={() => setTool('eraser')}
            >
              <Ionicons name="remove" size={24} color={tool === 'eraser' ? '#1E90FF' : '#fff'} />
              <Text style={[styles.toolButtonText, tool === 'eraser' && styles.activeToolText]}>
                Borracha
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={handleUndo}>
              <Ionicons name="arrow-undo" size={24} color="#fff" />
              <Text style={styles.toolButtonText}>Desfazer</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={handleClear}>
              <Ionicons name="trash" size={24} color="#FF6B6B" />
              <Text style={[styles.toolButtonText, { color: '#FF6B6B' }]}>Limpar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 5,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  toolsContainer: {
    backgroundColor: '#121212',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  toolSection: {
    marginBottom: 15,
  },
  toolLabel: {
    color: '#999',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedColorButton: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  whiteColorBorder: {
    borderWidth: 1,
    borderColor: '#666',
  },
  brushSizeContainer: {
    flexDirection: 'row',
  },
  brushSizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 12,
  },
  selectedBrushSize: {
    borderColor: '#1E90FF',
    backgroundColor: '#333',
  },
  brushSizeIndicator: {
    backgroundColor: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  toolButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: 4,
  },
  activeToolButton: {
    borderColor: '#1E90FF',
    backgroundColor: '#1a3a5a',
  },
  toolButtonText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  activeToolText: {
    color: '#1E90FF',
  },
});

export default DashboardModal;
