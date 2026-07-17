try:
    from PIL import Image
except ImportError:
    import sys
    print("Pillow library not found. Please run: pip install Pillow")
    sys.exit(1)

def remove_white_bg(img_path, output_path, threshold=235):
    try:
        img = Image.open(img_path).convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            # Check if pixel is near pure white
            if item[0] > threshold and item[1] > threshold and item[2] > threshold:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
                
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Successfully removed white background from {img_path} and saved as transparent PNG.")
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    remove_white_bg("vedtam TESTIMONIAL/image.png", "vedtam TESTIMONIAL/image_nobg.png")
    remove_white_bg("vedtam TESTIMONIAL/nimbuslogo.jpeg", "vedtam TESTIMONIAL/nimbuslogo_nobg.png")
