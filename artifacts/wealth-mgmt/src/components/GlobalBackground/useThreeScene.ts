import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export const useThreeScene = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const mountedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const requestRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!containerRef.current || mountedRef.current) return;
    mountedRef.current = true;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width < 768;

    // --- RENDERER ---
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.25; // Darker initially for better light contrast
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- SCENE & CAMERA ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 20, 100);
    camera.lookAt(0, 10, -200);
    cameraRef.current = camera;

    // --- SCROLL TRACKING ---
    const scrollInfo = { current: 0, target: 0 };
    const handleScroll = () => {
      scrollInfo.target = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // --- STAR FIELD (3 layers) ---
    const starCount = isMobile ? 2000 : 5000;
    const starColors = [0xffffff, 0xffccaa, 0x99ccff]; // white, warm amber, cool blue
    
    const createStars = (count: number, radius: number, speed: number) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        const r = radius * (1 + Math.random() * 0.2);
        
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        
        const colIdx = Math.random() > 0.3 ? 0 : (Math.random() > 0.6 ? 1 : 2);
        const color = new THREE.Color(starColors[colIdx]);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({
        size: isMobile ? 0.8 : 0.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      
      const stars = new THREE.Points(geometry, material);
      stars.userData.speed = speed;
      return stars;
    };

    const starLayers = [
      createStars(starCount, 400, 0.0001),
      createStars(starCount, 450, 0.00015),
      createStars(starCount, 500, 0.00008)
    ];
    starLayers.forEach(l => scene.add(l));

    // --- NEBULA PLANE ---
    const nebulaGeo = new THREE.PlaneGeometry(1000, 1000);
    const nebulaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uColor1: { value: new THREE.Color('#000820') },
        uColor2: { value: new THREE.Color('#0f0800') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uScroll;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec2 vUv;
        void main() {
          float noise = sin(vUv.x * 2.0 + uTime * 0.1 + uScroll * 5.0) * cos(vUv.y * 2.0 + uTime * 0.1 - uScroll * 3.0);
          vec3 finalColor = mix(uColor1, uColor2, noise * 0.5 + 0.5);
          gl_FragColor = vec4(finalColor, 0.1 + uScroll * 0.05);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    nebula.position.z = -300;
    scene.add(nebula);

    // --- ATMOSPHERIC SPHERE ---
    const atmGeo = new THREE.SphereGeometry(600, 32, 32);
    const atmMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uScroll: { value: 0 },
        uAtmosphereColor: { value: new THREE.Color(0.5, 0.35, 0.08) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uAtmosphereColor;
        uniform float uScroll;
        uniform float uTime;
        void main() {
          float pulse = (sin(uTime * 0.3) * 0.5 + 0.5) * 0.05;
          float intensity = pow(0.6 - dot(vNormal, vec3(0, 0, 1.0)), 8.0 - uScroll * 3.0);
          gl_FragColor = vec4(uAtmosphereColor, (intensity + pulse) * (0.15 + uScroll * 0.2));
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false
    });
    const atmosphere = new THREE.Mesh(atmGeo, atmMat);
    scene.add(atmosphere);

    // --- PARTICLE NETWORK ---
    const particleCount = isMobile ? 80 : 180;
    const particles: THREE.Mesh[] = [];
    const particleData: { driftX: number; driftY: number; driftZ: number; offset: number }[] = [];
    
    const pGroup = new THREE.Group();
    const pGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xC9A84C });

    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 250,
        (Math.random() - 0.5) * 80 - 100
      );
      pGroup.add(p);
      particles.push(p);
      particleData.push({
        driftX: Math.random() * 0.02,
        driftY: Math.random() * 0.02,
        driftZ: Math.random() * 0.02,
        offset: Math.random() * Math.PI * 2
      });
    }
    scene.add(pGroup);

    const lineMat = new THREE.LineBasicMaterial({ color: 0xC9A84C, transparent: true, opacity: 0.12 });
    let lineSegments: THREE.LineSegments | null = null;

    const updateLines = () => {
      const linePositions = [];
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dist = particles[i].position.distanceTo(particles[j].position);
          if (dist < 45) {
            linePositions.push(
              particles[i].position.x, particles[i].position.y, particles[i].position.z,
              particles[j].position.x, particles[j].position.y, particles[j].position.z
            );
          }
        }
      }
      
      if (lineSegments) pGroup.remove(lineSegments);
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      lineSegments = new THREE.LineSegments(lineGeo, lineMat);
      pGroup.add(lineSegments);
    };

    // --- POST PROCESSING ---
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.4, 0.85);
    
    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    if (!isMobile) composer.addPass(bloomPass);
    composerRef.current = composer;

    // --- ANIMATION LOOP ---
    const startTime = Date.now();
    const animate = () => {
      if (document.hidden) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const time = (Date.now() - startTime) * 0.001;
      requestRef.current = requestAnimationFrame(animate);

      // Smooth scroll interpolation
      scrollInfo.current += (scrollInfo.target - scrollInfo.current) * 0.05;
      
      // Dynamic Atmosphere Color Cycle (Gold -> Deep Blue -> Warm Amber)
      const hue = (Math.sin(time * 0.1) * 0.5 + 0.5);
      const color1 = new THREE.Color(0.5, 0.35, 0.08); // Gold
      const color2 = new THREE.Color(0.05, 0.1, 0.3); // Deep Blue
      atmMat.uniforms.uAtmosphereColor.value.lerpColors(color1, color2, hue);

      // Update Uniforms
      nebulaMat.uniforms.uTime.value = time;
      nebulaMat.uniforms.uScroll.value = scrollInfo.current;
      atmMat.uniforms.uTime.value = time;
      atmMat.uniforms.uScroll.value = scrollInfo.current;

      // Stars rotation
      starLayers.forEach(l => {
        l.rotation.y += l.userData.speed + scrollInfo.current * 0.0005;
        l.rotation.z += l.userData.speed * 0.2;
      });

      // Particle drift
      particles.forEach((p, i) => {
        const data = particleData[i];
        p.position.x += Math.sin(time * 0.5 + data.offset) * 0.05;
        p.position.y += Math.cos(time * 0.4 + data.offset) * 0.05;
        p.position.z += Math.sin(time * 0.3 + data.offset) * 0.05;
      });
      updateLines();

      // Camera floating + Scroll influence
      camera.position.x = Math.sin(time * 0.08) * 5;
      camera.position.y = 20 - scrollInfo.current * 40 + Math.cos(time * 0.1) * 2;
      camera.lookAt(Math.sin(time * 0.05) * 10, 10 - scrollInfo.current * 40, -200);

      // Atmosphere kinetic movement
      atmosphere.position.y = Math.sin(time * 0.2) * 10;
      atmosphere.position.x = Math.cos(time * 0.15) * 15;

      // Modulate bloom by scroll
      if (!isMobile) {
        bloomPass.strength = 0.6 + scrollInfo.current * 0.4;
      }

      composer.render();
    };

    animate();

    // --- RESIZE & VISIBILITY ---
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const handleVisibility = () => {
      if (document.hidden) cancelAnimationFrame(requestRef.current!);
      else requestRef.current = requestAnimationFrame(animate);
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleRouteChange = () => {
      if (!cameraRef.current) return;
      gsap.to(cameraRef.current.position, {
        z: cameraRef.current.position.z - 5,
        duration: 0.4,
        ease: "power2.out",
        yoyo: true,
        repeat: 1
      });
    };
    window.addEventListener('app-route-change', handleRouteChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('app-route-change', handleRouteChange);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (renderer.domElement) renderer.domElement.remove();
      renderer.dispose();
    };
  }, []);

  return { cameraRef };
};
