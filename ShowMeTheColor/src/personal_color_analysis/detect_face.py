# coding: utf-8
# import the necessary packages
from imutils import face_utils
import numpy as np
import dlib
import cv2
import matplotlib.pyplot as plt

class DetectFace:
    def __init__(self, image):
        # initialize dlib's face detector (HOG-based)
        # and then create the facial landmark predictor
        self.detector = dlib.get_frontal_face_detector()
        import os
        # Get the correct path to the landmarks file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        landmarks_path = os.path.join(current_dir, '..', '..', 'res', 'shape_predictor_68_face_landmarks.dat')
        if not os.path.exists(landmarks_path):
            # Try alternative path for Docker
            landmarks_path = '/app/res/shape_predictor_68_face_landmarks.dat'
        self.predictor = dlib.shape_predictor(landmarks_path)

        #face detection part
        self.img = cv2.imread(image)
        #if self.img.shape[0]>500:
        #    self.img = cv2.resize(self.img, dsize=(0,0), fx=0.8, fy=0.8)

        # init face parts
        self.right_eyebrow = []
        self.left_eyebrow = []
        self.right_eye = []
        self.left_eye = []
        self.left_cheek = []
        self.right_cheek = []

        # detect the face parts and set the variables
        self.detect_face_part()


    # return type : np.array
    def detect_face_part(self):
        # detect faces in the grayscale image
        gray = cv2.cvtColor(self.img, cv2.COLOR_BGR2GRAY)
        faces = self.detector(gray, 1)
        if len(faces) == 0:
            raise Exception("No face detected in the image")
        rect = faces[0]

        # determine the facial landmarks for the face region, then
        # convert the landmark (x, y)-coordinates to a NumPy array
        shape = self.predictor(gray, rect)
        shape = face_utils.shape_to_np(shape)

        # Use name-based lookup for compatibility with all imutils versions
        # (older versions have 7 entries, newer versions have 8 with 'inner_mouth')
        landmarks = dict(face_utils.FACIAL_LANDMARKS_IDXS)

        def get_part(name):
            (i, j) = landmarks[name]
            return shape[i:j]

        # set the variables
        # Caution: these coordinates fit on the RESIZED image.
        self.right_eyebrow = self.extract_face_part(get_part("right_eyebrow"))
        self.left_eyebrow = self.extract_face_part(get_part("left_eyebrow"))
        self.right_eye = self.extract_face_part(get_part("right_eye"))
        self.left_eye = self.extract_face_part(get_part("left_eye"))
        # Cheeks are detected by relative position to the face landmarks
        self.left_cheek = self.img[shape[29][1]:shape[33][1], shape[4][0]:shape[48][0]]
        self.right_cheek = self.img[shape[29][1]:shape[33][1], shape[54][0]:shape[12][0]]

    # parameter example : self.right_eye
    # return type : image
    def extract_face_part(self, face_part_points):
        (x, y, w, h) = cv2.boundingRect(face_part_points)
        crop = self.img[y:y+h, x:x+w]
        adj_points = np.array([np.array([p[0]-x, p[1]-y]) for p in face_part_points])

        # Create an mask
        mask = np.zeros((crop.shape[0], crop.shape[1]))
        cv2.fillConvexPoly(mask, adj_points, 1)
        mask = mask.astype(bool)
        crop[np.logical_not(mask)] = [255, 0, 0]

        return crop
