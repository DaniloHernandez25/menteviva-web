<?php
/**
 * API para consultar datos de Firebase por PIN de usuario
 * Uso: api.php?pin=3051
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

// Configuración de Firebase
$firebaseURL = 'https://fcar-9d923-default-rtdb.firebaseio.com/.json';

// Función para obtener datos de Firebase
function obtenerDatosFirebase($url) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if(curl_errno($ch)) {
        $error = curl_error($ch);
        curl_close($ch);
        return ['error' => 'Error de conexión: ' . $error];
    }
    
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return ['error' => 'Error HTTP: ' . $httpCode];
    }
    
    return json_decode($response, true);
}

// Obtener PIN de la URL
$pin = isset($_GET['pin']) ? $_GET['pin'] : null;

if (!$pin) {
    echo json_encode([
        'success' => false,
        'message' => 'Debe proporcionar un PIN',
        'ejemplo' => 'api.php?pin=3051'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Obtener todos los datos de Firebase
$datos = obtenerDatosFirebase($firebaseURL);

if (isset($datos['error'])) {
    echo json_encode([
        'success' => false,
        'message' => $datos['error']
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Filtrar datos por PIN
$resultado = [
    'success' => true,
    'pin' => $pin,
    'datos' => []
];

// Verificar si el usuario existe
if (!isset($datos['usuarios'][$pin])) {
    echo json_encode([
        'success' => false,
        'message' => 'Usuario no encontrado con PIN: ' . $pin
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Agregar información del usuario
$resultado['usuario'] = $datos['usuarios'][$pin];

// Agregar datos de cada prueba
$pruebas = ['calculo', 'espacial', 'lenguaje', 'memoria', 'orientacion', 'rompecabezas'];

foreach ($pruebas as $prueba) {
    if (isset($datos[$prueba][$pin])) {
        $resultado['datos'][$prueba] = $datos[$prueba][$pin];
        
        // Calcular estadísticas
        $evaluaciones = $datos[$prueba][$pin];
        $numEvaluaciones = count($evaluaciones);
        $tiempoTotal = 0;
        
        foreach ($evaluaciones as $evaluacion) {
            if (isset($evaluacion['tiempoUsado'])) {
                $tiempoTotal += $evaluacion['tiempoUsado'];
            }
        }
        
        $resultado['estadisticas'][$prueba] = [
            'total_evaluaciones' => $numEvaluaciones,
            'tiempo_promedio' => $numEvaluaciones > 0 ? round($tiempoTotal / $numEvaluaciones, 2) : 0
        ];
    }
}

// Calcular estadísticas generales
$resultado['resumen'] = [
    'total_pruebas_realizadas' => count($resultado['datos']),
    'fecha_primera_evaluacion' => null,
    'fecha_ultima_evaluacion' => null
];

// Encontrar fechas de evaluaciones
$todasFechas = [];
foreach ($resultado['datos'] as $prueba => $evaluaciones) {
    foreach ($evaluaciones as $evaluacion) {
        if (isset($evaluacion['fecha'])) {
            $todasFechas[] = $evaluacion['fecha'];
        }
    }
}

if (!empty($todasFechas)) {
    sort($todasFechas);
    $resultado['resumen']['fecha_primera_evaluacion'] = $todasFechas[0];
    $resultado['resumen']['fecha_ultima_evaluacion'] = end($todasFechas);
}

echo json_encode($resultado, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>